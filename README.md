# API Access Gateway

A tool to ensure seamless access to APIs from sanctioned regions using Cloudflare Workers. This project dynamically routes API calls through a global edge network to bypass regional restrictions.

This project is licensed under the [MIT License](LICENSE).

## Features
- Dynamic API routing via Workers KV
- Scalable and secure
- Easy to configure and deploy

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jaavid/api-access-gateway.git
   cd api-access-gateway
   ```

2. Install Cloudflare Wrangler:

    ```bash
    npm install -g wrangler
    ```

3. Configure wrangler.toml:

    - Replace your-account-id with your Cloudflare account ID.
    - Replace your-zone-id with your Cloudflare zone ID.
    - Replace your-namespace-id with your Workers KV namespace ID.

4. Deploy the Worker:

    ```bash
    wrangler publish
    ```

## How It Works
- Requests are routed through Cloudflare Workers.
- Workers KV stores API host mappings dynamically.
- Calls are forwarded to the appropriate API via a single Worker.

## Example:
- Telegram: `https://your-worker-domain.workers.dev/telegram/bot1234:123/sendMessage`
- Open AI Service: `https://your-worker-domain.workers.dev/ai/v1/chat/completions`

## Setting Up Workers KV

1. **Create a namespace**
   ```bash
   wrangler kv:namespace create "APIRoutes"
   ```
   Copy the resulting `id` into `wrangler.toml` under `kv_namespaces`.

2. **Add host mappings**
   ```bash
   wrangler kv:key put /telegram api.telegram.org --binding=APIRoutes
   ```
   Keys represent base paths like `/telegram`, values are the target hosts such as `api.telegram.org`.

## Obtaining Cloudflare IDs

Include these values in `wrangler.toml`:

* **account_id** – visible via `wrangler whoami` after logging in or on the dashboard under **My Profile**.
* **zone_id** – found on your domain's **Overview** page in the Cloudflare dashboard.
* **namespace_id** – provided when you create the KV namespace or shown in **Workers > KV**.

## Contributing
We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details.

