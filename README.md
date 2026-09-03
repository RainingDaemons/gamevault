# Game Vault

A password-protected, single-page web app that serves a curated Markdown file (game server IPs, passwords, notes) behind a server-side auth gate. The content is only ever read, compiled and rendered on the server, after a valid session is verified - it never reaches the client unless the visitor has authenticated.

## Install on Proxmox LXC

Run this in the Proxmox VE Shell. It creates an unprivileged Debian 12 LXC,
installs Node.js + pnpm, builds the app, prompts for the vault password and
starts it as a systemd service on `:3000`:

```sh
bash -c "$(curl -fsSL https://raw.githubusercontent.com/RainingDaemons/gamevault/main/gamevault.sh)"
```

After install:

- **Vault password** is prompted for during install and stored as an Argon2id
  hash in `/etc/gamevault/gamevault.env` (root-only, `0600`).
- **Server list** lives at `/etc/gamevault/servers.md`, outside the repo and
  outside `static/`. Edit it with your real servers — it is never committed to
  git and is only read after a valid session.
- The service listens on `http://<lxc-ip>:3000`. Expose it via your existing
  `cloudflared` tunnel (map to `http://<lxc-ip>:3000`).

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

1. Create your markdown content at `/etc/gamevault/servers.md`.

2. Edit /etc/gamevault/gamevault.env:

  ```env
  NODE_ENV=production
  PORT=3000
  owner_name=
  SERVERS_MD_PATH=/etc/gamevault/servers.md
  SESSION_SECRET=...
  ORIGIN=http://192.168.100.66:3000
  CSRF_TRUSTED_ORIGINS=
  ```

With this command
```sh
hostname -I
```

Add LXC ip in ORIGIN, also specify trusted origins for CORS.

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
