# Game Vault

A password-protected, single-page web app that serves a curated Markdown file (game server IPs, passwords, notes) behind a server-side auth gate. The content is only ever read, compiled and rendered on the server, after a valid session is verified - it never reaches the client unless the visitor has authenticated.

## Stack

- SvelteKit (Node adapter, self-hosted)
- Tailwind CSS
- MDsveX (markdown compiled to HTML at request time, server-side)
- Argon2id password hashing (`@node-rs/argon2`)
- Signed, `httpOnly` session cookie with server-side session state

## Setup

```sh
pnpm install
```

1. Create your markdown content at `content/servers.md` (gitignored - never commit it).

2. Generate an Argon2id hash of your shared password:

  ```sh
  pnpm hash:password your-password
  ```

3. Create a `.env` file (see `.env.example`):

  ```sh
  PASSWORD_HASH=<hash from step 2>
  SESSION_SECRET=<random 32+ bytes, e.g. `openssl rand -base64 32`>
  NODE_ENV=production
  ```

## Development

```sh
pnpm dev
```

In dev, `NODE_ENV` is `development`, so cookies are not `secure` (allows testing
over `http://localhost`).

## Production

```sh
pnpm build
NODE_ENV=production node build
```

Run behind a reverse proxy (Caddy/Traefik) that terminates TLS. Because cookies
are `secure`, the app must be served over HTTPS in production. For correct
rate-limiting behind the proxy, set `ADDRESS_HEADER=x-forwarded-for`.

## Security notes

- `servers.md` lives outside `src/routes` and is read with Node `fs` only in a server-only module. Vite never bundles it client-side.
- The protected route's load checks the session **before** compiling content and redirects unauthenticated requests — so an unauthenticated response never contains the note content in HTML or serialized `__data.json`.
- Rendered HTML is sanitized server-side (`sanitize-html`) before being returned to `{@html}`.
- Passwords are never stored in plaintext — only an Argon2id hash is compared.
