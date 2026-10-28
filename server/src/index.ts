import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import session from "express-session";
import helmet from "helmet";
import type { ApiError, Business, GraphResponse, Permission, Profile, TokenMetadata } from "./types.js";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const app = express();
const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || "127.0.0.1";
const isProduction = process.env.NODE_ENV === "production";
const appId = process.env.VITE_META_APP_ID || "1080080558309956";
const configId = process.env.VITE_META_CONFIG_ID;
const appSecret = process.env.META_APP_SECRET;
const graphVersion = (process.env.META_GRAPH_API_VERSION || "v25.0").replace(/^\//, "");
const frontendUrl = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
const backendUrl = (process.env.BACKEND_URL || "http://localhost:3001").replace(/\/$/, "");
const callbackUrl = `${backendUrl}/api/auth/meta/callback`;
const useSecureCookies = isProduction || backendUrl.startsWith("https://");

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: isProduction ? undefined : false }));
app.use(express.json({ limit: "32kb" }));
app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
app.use(session({
  name: "avernek.meta.sid",
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, secure: useSecureCookies, sameSite: "lax", maxAge: 60 * 60 * 1000 },
}));

function configurationMissing(): string[] {
  return [!configId && "VITE_META_CONFIG_ID", !appSecret && "META_APP_SECRET", !process.env.SESSION_SECRET && "SESSION_SECRET"].filter(Boolean) as string[];
}

function sanitizeError(value: unknown): ApiError {
  if (value && typeof value === "object") {
    const error = value as { message?: unknown; code?: unknown; type?: unknown; fbtrace_id?: unknown };
    const traceId = typeof error.fbtrace_id === "string" ? error.fbtrace_id : typeof (error as { traceId?: unknown }).traceId === "string" ? (error as { traceId: string }).traceId : undefined;
    return { message: String(error.message || "Meta Graph API request failed"), ...(typeof error.code === "number" ? { code: error.code } : {}), ...(typeof error.type === "string" ? { type: error.type } : {}), ...(traceId ? { traceId } : {}) };
  }
  return { message: "Meta Graph API request failed" };
}

async function graphGet<T>(route: string, accessToken: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`https://graph.facebook.com/${graphVersion}/${route.replace(/^\//, "")}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  url.searchParams.set("access_token", accessToken);
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const body = await response.json() as GraphResponse<T>;
  if (!response.ok || body.error) throw sanitizeError(body.error || { message: `Meta returned HTTP ${response.status}` });
  return body as T;
}

async function populateSession(req: Request, accessToken: string): Promise<void> {
  const errors: Record<string, ApiError> = {};
  const [profileResult, permissionsResult, businessesResult, debugResult] = await Promise.allSettled([
    graphGet<Profile>("me", accessToken, { fields: "id,name" }),
    graphGet<{ data: Permission[] }>("me/permissions", accessToken),
    graphGet<{ data: Business[] }>("me/businesses", accessToken, { fields: "id,name,verification_status", limit: "100" }),
    graphGet<{ data: { is_valid: boolean; type?: string; expires_at?: number } }>("debug_token", `${appId}|${appSecret}`, { input_token: accessToken }),
  ]);
  if (profileResult.status === "fulfilled") req.session.profile = profileResult.value; else errors.profile = sanitizeError(profileResult.reason);
  if (permissionsResult.status === "fulfilled") req.session.permissions = permissionsResult.value.data; else errors.permissions = sanitizeError(permissionsResult.reason);
  if (businessesResult.status === "fulfilled") req.session.businesses = businessesResult.value.data; else errors.businesses = sanitizeError(businessesResult.reason);
  if (debugResult.status === "fulfilled") req.session.tokenMetadata = { valid: debugResult.value.data.is_valid, type: debugResult.value.data.type, expiresAt: debugResult.value.data.expires_at } satisfies TokenMetadata; else errors.tokenValidation = sanitizeError(debugResult.reason);
  req.session.graphErrors = errors;
  if (req.session.selectedBusinessId && !req.session.businesses?.some((business) => business.id === req.session.selectedBusinessId)) req.session.selectedBusinessId = undefined;
}

function sessionPayload(req: Request) {
  return {
    configured: configurationMissing().length === 0,
    connected: Boolean(req.session.accessToken),
    profile: req.session.profile,
    permissions: req.session.permissions || [],
    businesses: req.session.businesses || [],
    selectedBusinessId: req.session.selectedBusinessId,
    token: req.session.tokenMetadata,
    graphErrors: req.session.graphErrors,
  };
}

function requireConnection(req: Request, res: Response): string | undefined {
  if (!req.session.accessToken) { res.status(401).json({ error: { message: "Connect a Meta Business account first." } }); return undefined; }
  return req.session.accessToken;
}

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "avernek-meta-review-demo", oauthCallback: callbackUrl }));
app.get("/api/session", (req, res) => res.json(sessionPayload(req)));

app.get("/api/auth/meta/start", (req, res) => {
  const missing = configurationMissing();
  if (missing.length) return res.status(503).json({ error: { message: `Missing server configuration: ${missing.join(", ")}` } });
  const state = crypto.randomBytes(32).toString("base64url");
  req.session.oauthState = state;
  const authorization = new URL(`https://www.facebook.com/${graphVersion}/dialog/oauth`);
  authorization.search = new URLSearchParams({ client_id: appId, config_id: configId!, redirect_uri: callbackUrl, response_type: "code", state }).toString();
  return req.session.save(() => res.redirect(authorization.toString()));
});

app.get("/api/auth/meta/callback", async (req, res) => {
  const { code, state, error, error_description: description } = req.query;
  if (error) return res.redirect(`${frontendUrl}/?auth_error=${encodeURIComponent(String(description || error))}`);
  const expectedState = req.session.oauthState;
  const stateIsValid = typeof state === "string" && typeof expectedState === "string" && state.length === expectedState.length && crypto.timingSafeEqual(Buffer.from(state), Buffer.from(expectedState));
  if (!stateIsValid) return res.status(400).send("Invalid OAuth state. Start the connection again from the Avernek demo.");
  req.session.oauthState = undefined;
  if (typeof code !== "string") return res.status(400).send("Meta did not return an authorization code.");
  try {
    const tokenUrl = new URL(`https://graph.facebook.com/${graphVersion}/oauth/access_token`);
    tokenUrl.search = new URLSearchParams({ client_id: appId, client_secret: appSecret!, redirect_uri: callbackUrl, code }).toString();
    const response = await fetch(tokenUrl, { headers: { Accept: "application/json" } });
    const body = await response.json() as GraphResponse<{ access_token?: string }>;
    if (!response.ok || body.error || !body.access_token) throw sanitizeError(body.error || { message: "Meta did not return an access token." });
    req.session.accessToken = body.access_token;
    await populateSession(req, body.access_token);
    return req.session.save(() => res.redirect(`${frontendUrl}/?connected=1`));
  } catch (caught) {
    const safe = sanitizeError(caught);
    return res.redirect(`${frontendUrl}/?auth_error=${encodeURIComponent(safe.message)}`);
  }
});

app.post("/api/refresh", async (req, res) => {
  const token = requireConnection(req, res); if (!token) return;
  await populateSession(req, token);
  return res.json(sessionPayload(req));
});

app.post("/api/businesses/select", (req, res) => {
  if (!requireConnection(req, res)) return;
  const businessId = typeof req.body.businessId === "string" ? req.body.businessId : "";
  if (!req.session.businesses?.some((business) => business.id === businessId)) return res.status(403).json({ error: { message: "That business was not returned in the authorized /me/businesses response." } });
  req.session.selectedBusinessId = businessId;
  return req.session.save(() => res.json(sessionPayload(req)));
});

app.get("/api/businesses/:businessId", async (req, res) => {
  const token = requireConnection(req, res); if (!token) return;
  const businessId = req.params.businessId;
  if (!req.session.businesses?.some((business) => business.id === businessId)) return res.status(403).json({ error: { message: "This business is not in the current authorized portfolio list." } });
  try {
    const business = await graphGet<Business>(businessId, token, { fields: "id,name,verification_status" });
    const definitions = [
      { key: "pages", label: "Owned Facebook Pages", edge: "owned_pages", fields: "id,name", requiredPermissions: ["business_management"], note: "Page fields beyond basic identity can require Pages-specific permissions." },
      { key: "adAccounts", label: "Owned ad accounts", edge: "owned_ad_accounts", fields: "id,name,account_status,currency", requiredPermissions: ["business_management"], note: "Reading advertising data requires ads_read; this demo does not request it." },
    ];
    const results = await Promise.all(definitions.map(async (definition) => {
      try { const result = await graphGet<{ data: Array<Record<string, unknown>> }>(`${businessId}/${definition.edge}`, token, { fields: definition.fields, limit: "100" }); return { ...definition, endpoint: `/${businessId}/${definition.edge}`, data: result.data }; }
      catch (caught) { return { ...definition, endpoint: `/${businessId}/${definition.edge}`, error: sanitizeError(caught) }; }
    }));
    return res.json({ business, assets: results });
  } catch (caught) { return res.status(502).json({ error: sanitizeError(caught) }); }
});

app.post("/api/disconnect", (req, res) => req.session.destroy((error) => {
  if (error) return res.status(500).json({ error: { message: "Could not clear the server session." } });
  res.clearCookie("avernek.meta.sid", { httpOnly: true, secure: useSecureCookies, sameSite: "lax" });
  return res.status(204).end();
}));

if (isProduction) {
  const clientDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../client");
  app.use(express.static(clientDirectory));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDirectory, "index.html")));
}

app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
  console.error("Unhandled request error", error instanceof Error ? error.message : "Unknown error");
  res.status(500).json({ error: { message: "An unexpected server error occurred." } });
});

app.listen(port, host, () => {
  console.log(`Avernek review demo API listening at http://${host}:${port}`);
  if (configurationMissing().length) console.warn(`Configuration required: ${configurationMissing().join(", ")}`);
});
