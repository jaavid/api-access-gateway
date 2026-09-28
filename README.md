# API Access Gateway

A small Cloudflare Worker used as an **allowlisted outbound API gateway** for applications that cannot reliably reach some third-party APIs directly.

The gateway is designed to stay independent from applications such as `social-media-manager`: applications select a named route (`telegram`, `bale`, `meta`, …), while Workers KV controls which upstream host that route is allowed to reach.

## v2 features

- Allowlisted routing through Workers KV
- Optional `X-API-Gateway-Key` authentication
- Gateway health endpoint
- Route listing endpoint
- Per-route upstream connectivity probes with latency
- Backward-compatible KV values (`api.telegram.org` still works)
- Rich JSON route configuration for probe paths
- Gateway auth header is removed before forwarding upstream

## Request model

A KV entry:

```text
/telegram -> api.telegram.org
```

allows:

```text
POST https://gateway.example.com/telegram/bot<TOKEN>/sendMessage
```

to reach:

```text
https://api.telegram.org/bot<TOKEN>/sendMessage
```

The application cannot provide an arbitrary target URL. Only routes present in `APIRoutes` can be used.

## Route configuration

### Legacy/simple value

```text
/telegram -> api.telegram.org
```

### JSON value

```json
{
  "upstream": "https://api.telegram.org",
  "probe_path": "/"
}
```

Recommended routes for Social Media Manager:

```text
/telegram       -> {"upstream":"https://api.telegram.org","probe_path":"/"}
/bale           -> {"upstream":"https://tapi.bale.ai","probe_path":"/"}
/meta           -> {"upstream":"https://graph.facebook.com","probe_path":"/"}
/google         -> {"upstream":"https://www.googleapis.com","probe_path":"/"}
/google-oauth   -> {"upstream":"https://oauth2.googleapis.com","probe_path":"/"}
/google-upload  -> {"upstream":"https://upload.googleapis.com","probe_path":"/"}
/linkedin       -> {"upstream":"https://api.linkedin.com","probe_path":"/"}
```

## Control endpoints

All endpoints require `X-API-Gateway-Key` when the Worker secret `GATEWAY_API_KEY` is configured.

### Gateway health

```text
GET /_gateway/health
```

Example response:

```json
{
  "ok": true,
  "version": "2.0",
  "auth_required": true
}
```

### Configured routes

```text
GET /_gateway/routes
```

### Probe one upstream route

```text
GET /_gateway/probe/telegram
```

Any completed upstream HTTP response counts as reachable, even a 4xx response. The purpose of the probe is to verify DNS/TLS/HTTP connectivity, not application credentials.

Example:

```json
{
  "ok": true,
  "route": "telegram",
  "reachable": true,
  "upstream_status": 404,
  "latency_ms": 87
}
```

## Deployment

Install dependencies:

```bash
npm ci
```

Configure `wrangler.toml` with your account and KV namespace IDs.

Create the Worker secret:

```bash
npx wrangler secret put GATEWAY_API_KEY
```

Add routes to KV, for example:

```bash
npx wrangler kv key put --binding=APIRoutes "/telegram" \
  '{"upstream":"https://api.telegram.org","probe_path":"/"}'

npx wrangler kv key put --binding=APIRoutes "/bale" \
  '{"upstream":"https://tapi.bale.ai","probe_path":"/"}'
```

Run tests:

```bash
npm test
```

Deploy:

```bash
npx wrangler deploy
```

## Application configuration

For Social Media Manager:

```env
API_GATEWAY_URL=https://gateway.example.com
API_GATEWAY_KEY=your-secret
OUTBOUND_ROUTING_DEFAULT=auto
```

The application can additionally set per-service routing modes such as `OUTBOUND_TELEGRAM_MODE=gateway`.

## Security notes

- Do not implement `?url=https://...` style arbitrary forwarding.
- Keep routes allowlisted in KV.
- Configure `GATEWAY_API_KEY` in production.
- Rotate the gateway key if it is exposed.
- The gateway strips `X-API-Gateway-Key` before forwarding upstream.
- Upstream credentials remain the application's responsibility.

## License

MIT — see [LICENSE](LICENSE).
