# Avernek Meta Business Management App Review Demo

A standalone, read-only demonstration of Meta's `business_management` permission for Avernek Technologies Pvt. Ltd. It uses Facebook Login for Business, a backend authorization-code exchange, server-side sessions, and live Graph API responses.

This project does **not** start WhatsApp Embedded Signup, show QR codes, register phone numbers, or migrate WhatsApp accounts.

## Requirements

- Node.js 20 or newer
- A Meta app with Facebook Login for Business
- A **General** login configuration using a **User access token** and `business_management`
- A Facebook account that has access to at least one test Business Portfolio

## Local setup

```bash
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`. The Vite server proxies `/api` to Express on port 3001.

Add the Configuration ID from **Meta App Dashboard → Facebook Login for Business → Configurations** to:

```dotenv
VITE_META_CONFIG_ID=your-configuration-id
```

The backend reads this value; the frontend never needs it directly. Also set `META_APP_SECRET` and a random `SESSION_SECRET` of at least 32 characters. Never commit `.env`.

## Scripts

- `npm run dev` — run the Vite and Express development servers
- `npm run typecheck` — check frontend and backend TypeScript
- `npm run build` — create the production server and client bundles in `dist/`
- `npm start` — run the production Express server after building

For production, set `NODE_ENV=production`, use the same HTTPS origin for `FRONTEND_URL` and `BACKEND_URL`, then run `npm run build && npm start`. Express serves the built client and API.

## Vercel deployment

This repository includes a root `index.ts` Express entry and `vercel.json`. The production client is built into `public/`, which Vercel serves as static output, while `/api/*` is handled by the exported Express application.

In **Vercel → Project → Settings → Environment Variables**, add the values listed in `.env.vercel.example`. For the production deployment, the URL values must be:

```dotenv
FRONTEND_URL=https://fbwhatsappauth.vercel.app
BACKEND_URL=https://fbwhatsappauth.vercel.app
NODE_ENV=production
```

Do not upload or commit `.env`. Add `META_APP_SECRET` and `SESSION_SECRET` directly in Vercel and mark them sensitive. After adding or changing variables, redeploy the production deployment; Vercel does not retroactively apply variables to an existing deployment.

Set the Meta Valid OAuth Redirect URI to:

```text
https://fbwhatsappauth.vercel.app/api/auth/meta/callback
```

The default in-memory Express session store is intended for a single-process review demo. Vercel Functions can run on multiple instances, so a durable production deployment should use a shared session store such as Redis. Test the full OAuth round trip before submitting the Vercel URL for review.

## Security model

- The OAuth code is exchanged only by the backend.
- The Meta app secret and access token are never returned to the browser.
- Tokens are kept in an HTTP-only session cookie-backed server session.
- OAuth state is generated with 256 bits of randomness and validated on callback.
- Cookies are `Secure` in production and `SameSite=Lax`, which permits the top-level OAuth redirect.
- Disconnect destroys the backend session.

The default `express-session` memory store is suitable for this single-instance review demo only. For a durable multi-instance deployment, configure Redis or another supported server-side session store.

## Live API operations

- `GET /me`
- `GET /me/permissions`
- `GET /debug_token`
- `GET /me/businesses?fields=id,name,verification_status`
- `GET /{business-id}?fields=id,name,verification_status`
- `GET /{business-id}/owned_pages`
- `GET /{business-id}/owned_ad_accounts`

Every displayed portfolio and asset comes from these responses. Per-edge Meta errors are displayed as errors. Empty responses remain empty.

See [META_SETUP.md](./META_SETUP.md), [APP_REVIEW_GUIDE.md](./APP_REVIEW_GUIDE.md), and [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
