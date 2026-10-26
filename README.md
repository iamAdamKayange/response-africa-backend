# The Rapid Response Africa — API

Node.js (Express 5) REST API backed by PostgreSQL on [Neon](https://neon.tech). Powers the website and the Admin/Author panel.

## Run locally

```bash
cp .env.example .env      # then put your Neon DATABASE_URL and a JWT_SECRET in .env
npm install
npm run setup             # creates tables + sections, demo accounts and sample content
npm run dev               # http://localhost:4000/api/health
```

## Deploy on Render

**Option A — Blueprint (recommended):** push this folder to its own GitHub repo, then in Render choose
**New → Blueprint** and select the repo. `render.yaml` configures everything. When asked, set:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon → Connection details → **pooled** connection string |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` | Cloudflare R2 keys for image uploads (see below) |
| `R2_PUBLIC_URL` | The bucket's public URL (see below); optional |
| `CORS_ORIGIN` | The website **and** the admin panel, comma-separated, e.g. `https://rapid-response-africa.vercel.app,https://admin-response-africa.vercel.app` |

`JWT_SECRET` is generated automatically. Tables are created/updated on every start (`npm run migrate`, idempotent).

**Option B — manual Web Service:** Runtime Node · Build `npm ci` · Start `npm run migrate && npm start` ·
Health check `/api/health` · add the same env vars plus `JWT_SECRET` and `NODE_ENV=production`.

Seed once (from your computer, pointing at the production database, or from the Render Shell):

```bash
npm run seed
```

Then in Vercel set `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com` and redeploy the site.

> Render's free plan sleeps after 15 minutes idle; the first request then takes ~30–50 s. The website falls back to
> built-in content while the API wakes up. Upgrade the plan for always-on.

## Demo accounts

Created by `npm run seed` from the `SEED_*` values in `.env` (see `.env.example` for the defaults).
**Change both passwords** after the first sign-in (Panel → Profile) before going live.

| Role | Can do |
| --- | --- |
| **admin** | Everything: publish/unpublish, feature, edit/delete any article, briefings, team, subscribers |
| **author** | Write own articles, save drafts, submit for review, post briefings. Cannot publish. |

## API

Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/api/health` | DB check |
| GET | `/api/sections` | |
| GET | `/api/articles` | `?section=&region=&q=&featured=true&limit=&offset=&body=true` |
| GET | `/api/articles/:slug` | Published only |
| GET | `/api/briefings` | `?limit=` |
| POST | `/api/subscribers` | `{ email }` |
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

### Article body format

```
Plain paragraphs are separated by a blank line.

## A sub-heading

> A pull quote
```

## Image uploads (Cloudflare R2)

Editors upload images from the panel (`POST /api/admin/uploads`, max 10 MB, JPG/PNG/WebP/GIF/AVIF).
Files go to the R2 bucket under `articles/YYYY/MM/`; Render's own disk is never used.

**Turn on public access for fast image delivery:** Cloudflare → R2 → `africa-response-backet` → Settings →
Public access → enable the **r2.dev** URL (quick) or connect a custom domain such as `media.rapid-response.com`
(recommended for production). Put that address in `R2_PUBLIC_URL`.

Until `R2_PUBLIC_URL` is set, uploads still work: images are served through this API at `/api/media/...`
(slower, and they wait for the API to wake up on the free plan). Images uploaded in that mode keep their
`/api/media/...` address, so set `R2_PUBLIC_URL` before real publishing starts.

## Notes

- Editors can also paste image URLs from anywhere (Unsplash, etc.).
- If the logs show a `pg` SSL-mode warning, you can change `sslmode=require` to `sslmode=verify-full` in `DATABASE_URL`.
