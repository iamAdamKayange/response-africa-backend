# The Rapid Response Africa — API

Node.js (Express 5) REST API backed by PostgreSQL on [Neon](https://neon.tech). Powers the website and the Admin/Author panel.

## Run locally

```bash
cp .env.example .env      # then put your Neon DATABASE_URL and a JWT_SECRET in .env
npm install
npm run setup             # creates tables + sections, demo accounts and sample content
npm run dev               # http://localhost:4000/api/health
```

## Production (Hetzner VPS)

Live at **https://api.rapid-response.africa** — Ubuntu VPS, Node under **PM2** (process `response-africa-api`),
**Nginx** reverse proxy to `127.0.0.1:4000`, HTTPS by Let's Encrypt (Certbot). Database: Neon. Media: Cloudflare R2.

The server reads `.env` in the project folder (see `.env.example`). Required in production:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon → Connection details → **pooled** connection string |
| `JWT_SECRET` | Long random string (`node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Cloudflare R2 keys for image uploads |
| `R2_PUBLIC_URL` | The bucket's public URL (r2.dev or custom domain) |
| `CORS_ORIGIN` | Optional extra origins. `https://rapid-response.africa`, `https://www.rapid-response.africa`, `https://admin.rapid-response.africa` (any `*.rapid-response.africa` over https) and the projects' Vercel URLs are always allowed. |

### Update the server after a push

```bash
cd ~/response-africa-backend        # wherever the repo is cloned
git pull
npm ci --omit=dev
npm run migrate                     # idempotent
pm2 restart response-africa-api --update-env
pm2 logs response-africa-api --lines 50
curl -s https://api.rapid-response.africa/api/health
```

First-time PM2 setup (if starting from scratch): `pm2 start src/server.js --name response-africa-api`, then
`pm2 save` and `pm2 startup` so it comes back after a reboot.

Seed demo accounts and sample content once (never needed again on an existing database): `npm run seed`.

### Alternative: Render

`render.yaml` is a Render Blueprint (New → Blueprint). Render's free plan sleeps when idle.

## Demo accounts

Created by `npm run seed` from the `SEED_*` values in `.env` (see `.env.example` for the defaults).
**Change both passwords** after the first sign-in (Panel → Profile) before going live.

| Role | Can do |
| --- | --- |
| **admin** | Everything: publish/unpublish, choose the lead story, edit/delete any article, briefings, team, subscribers, newsletter |
| **author** | Write, publish, edit and unpublish their own articles (no admin review); post briefings. Cannot delete published articles or choose the lead story. |

## Newsletter (Resend)

- **New article alert:** every article is emailed to all active subscribers the first time it is published
  (by an admin or an author). Re-saving a published article never re-sends it.
- **The Daily Brief:** Monday–Friday at `DAILY_BRIEF_HOUR` (`DAILY_BRIEF_TZ`), covering everything published
  since the previous brief (Monday's covers the weekend). Skipped when nothing new was published. At most once a day.
- **Welcome email** when someone subscribes; every email has an unsubscribe link and Gmail/Apple one-click unsubscribe.
- Admin panel → **Newsletter**: setup status, delivery log, "Send me a test" and "Send Daily Brief now".

Setup: create a Resend account, add and verify the domain `rapid-response.africa` (Resend shows the DNS
records to add at your DNS host), create an API key, then set `RESEND_API_KEY` (and the other email
variables in `.env.example`) on the server and restart. Resend's free plan allows 100 emails/day.

## API

Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | DB check |
| GET | `/api/sections` | |
| GET | `/api/articles` | `?section=&region=&q=&featured=true&limit=&offset=&body=true` |
| GET | `/api/articles/:slug` | Published only |
| GET | `/api/briefings` | `?limit=` |
| POST | `/api/subscribers` | `{ email }` (sends the welcome email) |
| GET/POST | `/api/unsubscribe?token=` | Link in every email / one-click unsubscribe |
| GET | `/api/media/<key>` | Uploaded images (when the bucket has no public URL) |

Auth (`Authorization: Bearer <token>`)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ email, password }` → `{ token, user }` |
| GET/PUT | `/api/auth/me` | Profile; change password with `currentPassword` + `newPassword` |
| GET | `/api/admin/stats` | Dashboard numbers |
| GET/POST | `/api/admin/articles` | Authors see only their own |
| GET/PUT/DELETE | `/api/admin/articles/:id` | |
| GET/POST/PUT/DELETE | `/api/admin/briefings[/:id]` | |
| POST | `/api/admin/uploads` | multipart field `file` → `{ url, key }` |
| GET/POST/PUT/DELETE | `/api/admin/users[/:id]` | Admin only |
| GET/DELETE | `/api/admin/subscribers[/:id]` | Admin only; `?format=csv` to export |
| GET | `/api/admin/newsletter` | Admin only; setup status and send log |
| POST | `/api/admin/newsletter/test` | Admin only; emails the latest story to yourself |
| POST | `/api/admin/newsletter/daily` | Admin only; sends today's Daily Brief now |

### Article body format

```
Plain paragraphs are separated by a blank line.

## A sub-heading

> A pull quote
```

## Image uploads (Cloudflare R2)

Editors upload images from the panel (`POST /api/admin/uploads`, max 10 MB, JPG/PNG/WebP/GIF/AVIF).
Files go to the R2 bucket under `articles/YYYY/MM/`; the server's own disk is never used.

**Turn on public access for fast image delivery:** Cloudflare → R2 → `africa-response-backet` → Settings →
Public access → enable the **r2.dev** URL (quick) or connect a custom domain such as `media.rapid-response.com`
(recommended for production). Put that address in `R2_PUBLIC_URL`.

Until `R2_PUBLIC_URL` is set, uploads still work: images are served through this API at `/api/media/...`
(slower). Images uploaded in that mode keep their
`/api/media/...` address, so set `R2_PUBLIC_URL` before real publishing starts.

## Notes

- Editors can also paste image URLs from anywhere (Unsplash, etc.).
- If the logs show a `pg` SSL-mode warning, you can change `sslmode=require` to `sslmode=verify-full` in `DATABASE_URL`.
