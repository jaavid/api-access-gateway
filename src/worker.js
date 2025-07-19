const kvNamespace = APIRoutes;

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    const url = new URL(request.url);

    // Extract the base path to determine the API route
    const basePath = url.pathname.split('/')[1];

    // Validate basePath to avoid empty values
    if (!basePath) {
        return new Response('Invalid request', { status: 400 });
    }

    // Fetch the target host from Workers KV
    const targetHost = await kvNamespace.get(`/${basePath}`);

    if (!targetHost) {
        return new Response('API not found', { status: 404 });
    }

    // Update the URL to point to the target host
    url.host = targetHost;
    // Normalize pathname by removing only the leading basePath segment
    url.pathname = url.pathname.replace(new RegExp(`^/${basePath}`), '') || '/';

    // Forward the request to the target API
    // Clone the original request while updating the URL
    const proxiedRequest = new Request(url.toString(), request);

    return fetch(proxiedRequest);
}
