# Contributing to API Access Gateway

Thank you for taking the time to contribute to this project! The following guidelines should help you get started.

## Project Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/jaavid/api-access-gateway.git
   cd api-access-gateway
   ```
2. **Install Cloudflare Wrangler**
   ```bash
   npm install -g wrangler
   ```
3. **Configure `wrangler.toml`** by replacing the placeholder values with your own Cloudflare account information:
   - `account_id`
   - `zone_id`
   - KV namespace `id`
4. **Develop locally** using Cloudflare's development server
   ```bash
   wrangler dev
   ```
5. **Deploy** your changes when ready
   ```bash
   wrangler publish
   ```

## Coding Standards

- Use **4 spaces** for indentation.
- End statements with semicolons.
- Prefer `const` and `let` over `var`.
- Keep functions small and add comments where necessary for clarity.

## Submitting Pull Requests

1. Fork the repository and create your feature branch.
2. Commit your changes with clear and descriptive messages.
3. Push your branch to your fork and open a pull request against the `main` branch of this repository.
4. Ensure your pull request description explains the purpose of the change and includes any relevant context.

We appreciate all contributions and will review your pull request as soon as possible.
