# Link Portal — URL Shortener

React + Vite frontend, Express API, MySQL storage. One Node app serves the portal, the API and the short-link redirects.

## Features

- Admin login (single account from env vars, JWT in an httpOnly cookie, rate-limited)
- Shorten any http(s) URL, with optional custom alias and title
- Click counting + last-click time, totals dashboard
- Search, edit destination/title, delete
- `https://your-domain/<code>` → 302 redirect; unknown codes show a "Link not found" page
- Table is created automatically on first start

## Local development

Requires Node 20.19+ and a MySQL/MariaDB server.

```bash
npm install
cp .env.example .env        # fill in DB + admin values
npm run dev                 # API on :3000, Vite on :5173 (proxies /api)
```

Open http://localhost:5173. Short links in dev point at `BASE_URL` (default http://localhost:3000).

Production-style run: `npm run build && npm start` → http://localhost:3000.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `DB_HOST` | yes | Hostinger: usually `localhost` (or the host shown in hPanel → Databases) |
| `DB_PORT` | no | default `3306` |
| `DB_USER` | yes | e.g. `u123456789_links` |
| `DB_PASSWORD` | yes | |
| `DB_NAME` | yes | e.g. `u123456789_links` |
| `ADMIN_EMAIL` | yes | portal login |
| `ADMIN_PASSWORD` | yes | use a strong one |
| `JWT_SECRET` | yes | long random string: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `BASE_URL` | no | e.g. `https://go.yourdomain.com` (no trailing slash). Empty = auto-detect from request |
| `NODE_ENV` | yes in prod | `production` (enables secure cookies — HTTPS required) |
| `PORT` | no | Hostinger sets this automatically |

## Deploying to Hostinger (Node.js Web App)

1. **Database** — hPanel → *Databases → MySQL Databases*: create DB + user, note the name/user/password.
2. **App** — hPanel → *Websites → Add website → Node.js Web App*. Import from GitHub (push this repo) or upload a zip **without** `node_modules`, `client/dist` and `.env`.
3. **Build settings**
   - Node version: 20.x or newer
   - Build command: `npm run build`
   - Start command / entry file: `npm start` (entry: `server/index.js`)
4. **Environment variables** — add every variable from the table above in the app's settings.
5. Deploy. Check `https://your-domain/api/health` → `{"ok":true}`, then sign in at `https://your-domain/`.

Note: Node.js apps need a Hostinger plan that supports them (Business, Cloud or VPS). On a VPS, run `npm ci && npm run build`, then keep `npm start` alive with PM2 behind Nginx.
