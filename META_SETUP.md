# Meta Developer Dashboard Setup

These steps apply to Meta app **The President Hotel** (`1080080558309956`). Dashboard labels can change slightly as Meta updates its UI.

## 1. App and product

1. Open the app in Meta for Developers.
2. Confirm the app is a Business app and is connected to the appropriate verified business where required.
3. Add **Facebook Login for Business** if it is not already present.
4. Do not use WhatsApp Embedded Signup for this demo.

## 2. Create the login configuration

Open **Facebook Login for Business → Configurations → Create configuration** and set:

- Login variation: **General**
- Token type: **User access token**
- Permission: **business_management** only
- Assets: select the business assets the reviewer/test user is permitted to expose, if the configuration UI requests asset selection

Copy the resulting Configuration ID into the project `.env`:

```dotenv
VITE_META_CONFIG_ID=PASTE_CONFIGURATION_ID_HERE
```

The configuration controls the permission prompt. The application deliberately does not add a `scope` query parameter to override it.

## 3. OAuth and domains

For local testing, add this exact Valid OAuth Redirect URI:

```text
http://localhost:3001/api/auth/meta/callback
```

For review, deploy to HTTPS and add the exact production URI, for example:

```text
https://meta-review.example.com/api/auth/meta/callback
```

For the current Vercel production domain, use:

```text
https://fbwhatsappauth.vercel.app/api/auth/meta/callback
```

Then configure:

- **App Domains:** `meta-review.example.com` (hostname only)
- **Valid OAuth Redirect URIs:** the complete callback URL above
- **Client OAuth Login:** enabled
- **Web OAuth Login:** enabled
- **Enforce HTTPS:** enabled for production
- **Allowed Domains for the JavaScript SDK:** not required; this demo uses a server redirect and does not load the JavaScript SDK

Set matching environment values:

```dotenv
FRONTEND_URL=https://meta-review.example.com
BACKEND_URL=https://meta-review.example.com
NODE_ENV=production
```

The redirect URI sent during authorization and code exchange is always `${BACKEND_URL}/api/auth/meta/callback`. It must match the dashboard entry exactly, including scheme, hostname, port, and path.

## 4. App mode, roles, and testers

- In **Development** mode, only app administrators, developers, and testers can authorize permissions. Add your test Facebook account under **App Roles** and accept the invitation.
- The test account must also have a role with access to the Business Portfolio used in the recording.
- In **Live** mode, people without an app role can use only permissions/features for which the app has the required access and approval.
- Request Advanced Access for `business_management` in **App Review → Permissions and Features**. Do not describe the permission as approved until Meta approves it.

## 5. App settings

Complete the dashboard's required public metadata before review, including privacy policy URL, data deletion instructions/callback, app icon, category, and contact email. These URLs must be reachable by Meta.

## 6. Environment values

```dotenv
VITE_META_APP_ID=1080080558309956
VITE_META_CONFIG_ID=your-general-login-configuration-id
META_APP_SECRET=your-app-secret
META_GRAPH_API_VERSION=v25.0
SESSION_SECRET=a-long-random-value-at-least-32-characters
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3001
PORT=3001
HOST=127.0.0.1
NODE_ENV=development
```

Use a Graph API version currently supported and selected for the app. Confirm it in Meta's dashboard before recording; API versions are time-sensitive.
