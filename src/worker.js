const kvNamespace = APIRoutes;

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

function gatewayApiKey() {
    try {
        return typeof GATEWAY_API_KEY !== 'undefined' ? String(GATEWAY_API_KEY || '') : '';
    } catch (_) {
        return '';
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'content-type': 'application/json; charset=utf-8' }
    });
}

function isAuthorized(request) {
    const expected = gatewayApiKey();
    if (!expected) return true; // backward-compatible until a Worker secret is configured
    return request.headers.get('X-API-Gateway-Key') === expected;
}

function normalizeRouteConfig(raw) {
    if (!raw) return null;

    let parsed = raw;
    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('{')) {
            try {
                parsed = JSON.parse(trimmed);
            } catch (_) {
                return null;
            }
        } else {
            parsed = { upstream: trimmed };
        }
    }

    if (!parsed || typeof parsed !== 'object' || !parsed.upstream) return null;
    const upstream = String(parsed.upstream).trim();
    const normalizedUpstream = /^https?:\/\//i.test(upstream) ? upstream : `https://${upstream}`;

    try {
        const url = new URL(normalizedUpstream);
        if (!['http:', 'https:'].includes(url.protocol)) return null;
        return {
            upstream: url.origin,
            probe_path: parsed.probe_path || '/',
        };
    } catch (_) {
        return null;
    }
}

async function getRoute(routeName) {
    const raw = await kvNamespace.get(`/${routeName}`);
    return normalizeRouteConfig(raw);
}

function upstreamUrl(config, suffixPath, search) {
    const base = config.upstream.replace(/\/$/, '');
    const path = suffixPath && suffixPath.startsWith('/') ? suffixPath : `/${suffixPath || ''}`;
    return `${base}${path || '/'}${search || ''}`;
}

function rewriteSensitiveRoute(routeName, suffixPath, headers) {
    // Telegram-compatible Bot APIs put the bot token in the upstream URL.
    // Applications can instead call /telegram/bot/<method> and supply the token
    // in X-Upstream-Bot-Token. The Worker reconstructs the provider URL and
    // strips the internal header before the request leaves the gateway.
    if (!['telegram', 'bale'].includes(routeName)) return suffixPath;

    const token = (headers.get('X-Upstream-Bot-Token') || '').trim();
    if (!token) return suffixPath; // keep legacy /botTOKEN/... forwarding working
    if (token.length > 2048 || /[\r\n/]/.test(token)) return null;

    const match = suffixPath.match(/^\/bot\/(.+)$/);
    if (!match) return suffixPath;
    return `/bot${token}/${match[1]}`;
}

async function handleGatewayControl(request, url) {
    if (url.pathname === '/_gateway/health') {
        return json({
            ok: true,
            version: '2.0',
            auth_required: Boolean(gatewayApiKey()),
        });
    }

    if (url.pathname === '/_gateway/routes') {
        const listed = await kvNamespace.list({ limit: 1000 });
        const routes = [];
        for (const key of listed.keys || []) {
            if (!key.name.startsWith('/')) continue;
            const name = key.name.slice(1);
            if (!name || name.startsWith('_gateway')) continue;
            const config = await getRoute(name);
            if (!config) continue;
            routes.push({ name, upstream: config.upstream, probe_path: config.probe_path });
        }
        routes.sort((a, b) => a.name.localeCompare(b.name));
        return json({ routes });
    }

    const probeMatch = url.pathname.match(/^\/_gateway\/probe\/([A-Za-z0-9._-]+)$/);
    if (probeMatch) {
        const routeName = probeMatch[1];
        const config = await getRoute(routeName);
        if (!config) return json({ ok: false, route: routeName, error: 'route_not_found' }, 404);

        const target = upstreamUrl(config, config.probe_path || '/', '');
        const started = Date.now();
        try {
            const response = await fetch(target, {
                method: 'GET',
                redirect: 'manual',
                headers: { 'user-agent': 'api-access-gateway/2.0 health-probe' },
            });
            return json({
                ok: true,
                route: routeName,
                reachable: true,
                upstream_status: response.status,
                latency_ms: Date.now() - started,
            });
        } catch (error) {
            return json({
                ok: false,
                route: routeName,
                reachable: false,
                error: error && error.name ? error.name : 'upstream_error',
                latency_ms: Date.now() - started,
            }, 502);
        }
    }

    return json({ ok: false, error: 'gateway_endpoint_not_found' }, 404);
}

async function handleRequest(request) {
    const url = new URL(request.url);

    if (!isAuthorized(request)) {
        return json({ ok: false, error: 'unauthorized' }, 401);
    }

    if (url.pathname.startsWith('/_gateway/')) {
        return handleGatewayControl(request, url);
    }

    const parts = url.pathname.split('/').filter(Boolean);
    const routeName = parts.shift();
    if (!routeName) {
        return json({ ok: false, error: 'invalid_route' }, 400);
    }

    const config = await getRoute(routeName);
    if (!config) {
        return json({ ok: false, error: 'route_not_found', route: routeName }, 404);
    }

    const headers = new Headers(request.headers);
    const suffixPath = `/${parts.join('/')}`;
    const rewrittenPath = rewriteSensitiveRoute(routeName, suffixPath, headers);
    if (rewrittenPath === null) {
        return json({ ok: false, error: 'invalid_bot_token' }, 400);
    }
    const targetUrl = upstreamUrl(config, rewrittenPath, url.search);

    headers.delete('X-API-Gateway-Key');
    headers.delete('X-Upstream-Bot-Token');
    headers.delete('host');

    const init = {
        method: request.method,
        headers,
        redirect: 'manual',
    };
    if (!['GET', 'HEAD'].includes(request.method.toUpperCase())) {
        init.body = request.body;
    }

    try {
        return await fetch(targetUrl, init);
    } catch (error) {
        return json({
            ok: false,
            error: 'upstream_unreachable',
            route: routeName,
            detail: error && error.name ? error.name : 'fetch_failed',
        }, 502);
    }
}

if (typeof module !== 'undefined') {
  module.exports = { handleRequest, normalizeRouteConfig, upstreamUrl, rewriteSensitiveRoute };
}
