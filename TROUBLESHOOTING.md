# Troubleshooting

## Connect button is disabled

The server reports incomplete configuration. Create `.env`, set `VITE_META_CONFIG_ID`, `META_APP_SECRET`, and `SESSION_SECRET`, then restart both development servers.

## Redirect URI mismatch

The value sent to Meta is exactly:

```text
${BACKEND_URL}/api/auth/meta/callback
```

Add that full value to **Facebook Login for Business → Settings → Valid OAuth Redirect URIs**. Match HTTP/HTTPS, hostname, port, path, and trailing slash exactly. Do not use the Vite `5173` callback during local development; the backend exchange is on `3001`.

## Invalid or missing configuration ID

Confirm the ID came from this app's **Facebook Login for Business → Configurations** section and uses the **General** variation. Put it in `VITE_META_CONFIG_ID`, without quotes or whitespace, and restart the app. A configuration from another Meta app cannot be used with App ID `1080080558309956`.

## Invalid OAuth state

This indicates a stale/duplicate callback, a blocked session cookie, a changed host between login and callback, or an expired server session. Return to the application and start again. Keep `FRONTEND_URL`, `BACKEND_URL`, and the browser hostname consistent (`localhost` versus `127.0.0.1`).

## User denied authorization

The application returns to the connect page and displays Meta's denial message. Start again only after the user is ready to authorize. The application cannot bypass denial.

## `/me/businesses` is empty

Check all of the following:

- The Facebook account has an appropriate role on a Business Portfolio.
- The account has accepted its app-role/tester invitation while the app is in Development mode.
- The login configuration includes `business_management`.
- The permission is shown as `granted` in the dashboard.
- The intended portfolio/assets were selected during Meta authorization where applicable.

An empty `data` array is a valid Meta response and is not replaced with sample data.

## Permission or eligibility error

The dashboard shows the real Graph API message and error code. Typical causes include missing Advanced Access, app mode restrictions, business verification/eligibility, insufficient user tasks on the portfolio, or an asset-specific permission not included in this minimal configuration. Resolve the item in Meta App Dashboard or Business Settings; do not add unrelated permissions solely to hide the error.

The demo requests only `business_management` through the Login for Business configuration. Advertising metrics require `ads_read`, and Page content requires Pages-specific permissions. Those operations are intentionally outside this review demo.

## Access token expired or invalid

Choose **Disconnect**, then connect again to obtain a fresh token. If Disconnect cannot complete, clear the `avernek.meta.sid` cookie and restart the flow. Tokens are never stored in localStorage.

## Secure cookie does not appear in production

Production sets `Secure` cookies. Use HTTPS, ensure the reverse proxy forwards the original protocol, and keep `app.set("trust proxy", 1)` enabled. Do not run `NODE_ENV=production` on a plain HTTP URL.

## Asset edge returns an error while the portfolio works

This is expected when the portfolio is accessible but the user, token, app access level, or selected assets do not authorize that edge. The UI reports each asset edge independently so the successful portfolio read remains visible alongside the genuine limitation.

## WhatsApp number or QR issues

They are outside this application. This project never calls WhatsApp onboarding, Embedded Signup, QR, phone registration, or migration endpoints and does not modify an existing WhatsApp Coexistence configuration.
