# API Access Gateway

A tool to ensure seamless access to APIs from sanctioned regions using Cloudflare Workers. This project dynamically routes API calls through a global edge network to bypass regional restrictions.

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


## Contributing
We welcome contributions! Please read CONTRIBUTING.md for details.

