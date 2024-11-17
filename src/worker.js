const kvNamespace = APIRoutes;

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);

    // Extract the base path to determine the API route
    const basePath = url.pathname.split('/')[1];

    // Fetch the target host from Workers KV
    const targetHost = await kvNamespace.get(`/${basePath}`);

    if (!targetHost) {
        return new Response('API not found', { status: 404 });
    }

    // Update the URL to point to the target host
    url.host = targetHost;
    url.pathname = url.pathname.replace(`/${basePath}`, ''); // Remove basePath

    // Forward the request to the target API
    const proxiedRequest = new Request(url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
        redirect: 'follow'
    });

    return fetch(proxiedRequest);
}
