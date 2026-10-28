import { useCallback, useEffect, useMemo, useState } from "react";
import type { ApiError, AssetResult, BusinessDetails, SessionState } from "./types";

const initial: SessionState = { configured: false, connected: false, permissions: [], businesses: [] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { credentials: "include", headers: { "Content-Type": "application/json", ...init?.headers }, ...init });
  if (response.status === 204) return {} as T;
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    await response.text();
    throw new Error(`The API returned ${contentType || "a non-JSON response"} for ${path}. Check that the Vite /api proxy can reach the Express server on port 3001.`);
  }
  const body: unknown = await response.json().catch(() => { throw new Error(`The API returned invalid JSON for ${path}.`); });
  if (!response.ok) {
    const errorBody = isRecord(body) && isRecord(body.error) ? body.error : undefined;
    const message = errorBody && typeof errorBody.message === "string" ? errorBody.message : isRecord(body) && typeof body.message === "string" ? body.message : `Request failed (${response.status})`;
    throw new Error(message);
  }
  return body as T;
}

function normalizeSession(value: unknown): SessionState {
  if (!isRecord(value)) throw new Error("The session API returned an invalid response.");
  return {
    configured: value.configured === true,
    connected: value.connected === true,
    profile: isRecord(value.profile) && typeof value.profile.id === "string" ? { id: value.profile.id, ...(typeof value.profile.name === "string" ? { name: value.profile.name } : {}) } : undefined,
    permissions: Array.isArray(value.permissions) ? value.permissions.filter((item): item is { permission: string; status: string } => isRecord(item) && typeof item.permission === "string" && typeof item.status === "string") : [],
    businesses: Array.isArray(value.businesses) ? value.businesses.filter((item): item is { id: string; name: string; verification_status?: string } => isRecord(item) && typeof item.id === "string" && typeof item.name === "string") : [],
    selectedBusinessId: typeof value.selectedBusinessId === "string" ? value.selectedBusinessId : undefined,
    token: isRecord(value.token) && typeof value.token.valid === "boolean" ? { valid: value.token.valid, ...(typeof value.token.type === "string" ? { type: value.token.type } : {}), ...(typeof value.token.expiresAt === "number" ? { expiresAt: value.token.expiresAt } : {}) } : undefined,
    graphErrors: isRecord(value.graphErrors) ? value.graphErrors as SessionState["graphErrors"] : undefined,
  };
}

function normalizeBusinessDetails(value: unknown): BusinessDetails {
  if (!isRecord(value) || !isRecord(value.business) || typeof value.business.id !== "string" || typeof value.business.name !== "string" || !Array.isArray(value.assets)) {
    throw new Error("The business API returned an invalid response.");
  }
  return value as unknown as BusinessDetails;
}

function Brand() {
  return <div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-lg bg-ink text-sm font-bold text-white">A</div><div><p className="m-0 text-sm font-semibold tracking-tight">Avernek Technologies</p><p className="m-0 text-[11px] text-slate-500">Business integrations</p></div></div>;
}

function StatusPill({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${ok ? "bg-mint text-moss" : "bg-slate-100 text-slate-600"}`}><span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-600" : "bg-slate-400"}`} />{children}</span>;
}

function ErrorBox({ title, error }: { title: string; error: ApiError | Error }) {
  const e = error as ApiError;
  return <div className="rounded-xl border border-amber-200 bg-amber-50 p-4"><p className="m-0 text-sm font-semibold text-amber-950">{title}</p><p className="mb-0 mt-1 text-sm leading-6 text-amber-900">{e.message}</p>{e.code && <p className="mb-0 mt-2 font-mono text-xs text-amber-800">Meta error code: {e.code}{e.traceId ? ` · Trace: ${e.traceId}` : ""}</p>}</div>;
}

function Walkthrough({ state, details }: { state: SessionState; details: BusinessDetails | null }) {
  const permissions = Array.isArray(state.permissions) ? state.permissions : [];
  const hasBusinessManagement = permissions.some((permission) => permission.permission === "business_management" && permission.status === "granted");
  const hasBusiness = Boolean(state.selectedBusinessId && details?.business);
  const assetSuccess = Boolean(details?.assets.some((asset) => Array.isArray(asset.data)));
  const steps = [
    ["Connect Meta Business", state.connected],
    ["Authorize through Meta", state.connected && hasBusinessManagement],
    ["Select an accessible portfolio", Boolean(state.selectedBusinessId)],
    ["Retrieve business information", hasBusiness],
    ["View authorized business assets", assetSuccess],
    ["Support business integrations", hasBusiness && assetSuccess],
  ] as const;
  return <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><div className="mb-5 flex items-center justify-between"><div><p className="m-0 text-[11px] font-bold uppercase tracking-[.16em] text-moss">App Review</p><h2 className="mb-0 mt-1 text-lg font-semibold">Walkthrough</h2></div><span className="text-xs text-slate-500">Live state only</span></div><ol className="space-y-0">{steps.map(([label, done], index) => <li key={label} className="relative flex gap-3 pb-5 last:pb-0"><div className={`relative z-10 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-moss text-white" : "border border-line bg-white text-slate-400"}`}>{done ? "✓" : index + 1}</div>{index < steps.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-px ${done ? "bg-moss" : "bg-line"}`} />}<div><p className={`m-0 text-sm font-medium ${done ? "text-ink" : "text-slate-500"}`}>{label}</p>{index === 5 && <p className="mb-0 mt-1 text-xs leading-5 text-slate-500">Portfolio and asset visibility lets Avernek configure authorized automation services without changing WhatsApp phone setup.</p>}</div></li>)}</ol></section>;
}

function AssetCard({ asset }: { asset: AssetResult }) {
  const count = asset.data?.length;
  return <article className="rounded-xl border border-line p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="m-0 text-sm font-semibold">{asset.label}</h3><p className="mb-0 mt-1 font-mono text-[11px] text-slate-500">GET {asset.endpoint}</p></div><StatusPill ok={Boolean(asset.data)}>{asset.data ? `${count} returned` : "API error"}</StatusPill></div><p className="mb-0 mt-3 text-xs leading-5 text-slate-500">Required: {asset.requiredPermissions.join(" + ")}. {asset.note}</p>{asset.error && <div className="mt-3"><ErrorBox title="Meta did not return this asset group" error={asset.error} /></div>}{asset.data && count === 0 && <p className="mb-0 mt-3 text-sm text-slate-500">Meta returned an empty list for this authorized portfolio.</p>}{asset.data && count! > 0 && <ul className="mb-0 mt-3 grid gap-2 sm:grid-cols-2">{asset.data.map((item, i) => <li key={String(item.id ?? i)} className="rounded-lg bg-warm p-3"><p className="m-0 text-sm font-medium">{String(item.name ?? item.id ?? "Authorized asset")}</p>{item.id != null && <p className="mb-0 mt-1 font-mono text-[11px] text-slate-500">{String(item.id)}</p>}</li>)}</ul>}</article>;
}

export default function App() {
  const [state, setState] = useState<SessionState>(initial);
  const [details, setDetails] = useState<BusinessDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadDetails = useCallback(async (businessId?: string) => {
    if (!businessId) { setDetails(null); return; }
    try { setDetails(normalizeBusinessDetails(await api<unknown>(`/api/businesses/${encodeURIComponent(businessId)}`))); }
    catch (e) { setError(e as Error); setDetails(null); }
  }, []);

  const loadSession = useCallback(async () => {
    try { const next = normalizeSession(await api<unknown>("/api/session")); setState(next); await loadDetails(next.selectedBusinessId); }
    catch (e) { setError(e as Error); }
    finally { setLoading(false); }
  }, [loadDetails]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authError = params.get("auth_error");
    if (authError) setError(new Error(authError));
    if (params.has("auth_error") || params.has("connected")) window.history.replaceState({}, "", window.location.pathname);
    void loadSession();
  }, [loadSession]);

  const granted = useMemo(() => (Array.isArray(state.permissions) ? state.permissions : []).filter((p) => p.status === "granted"), [state.permissions]);
  const businesses = Array.isArray(state.businesses) ? state.businesses : [];
  async function selectBusiness(id: string) { setBusy(true); setError(null); try { const next = normalizeSession(await api<unknown>("/api/businesses/select", { method: "POST", body: JSON.stringify({ businessId: id }) })); setState(next); await loadDetails(id); } catch (e) { setError(e as Error); } finally { setBusy(false); } }
  async function refresh() { setBusy(true); setError(null); try { await api("/api/refresh", { method: "POST" }); await loadSession(); } catch (e) { setError(e as Error); } finally { setBusy(false); } }
  async function disconnect() { setBusy(true); setError(null); try { await api("/api/disconnect", { method: "POST" }); setDetails(null); await loadSession(); } catch (e) { setError(e as Error); } finally { setBusy(false); } }

  return <div className="min-h-screen bg-warm">
    <header className="border-b border-line bg-white"><div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4"><Brand /><div className="flex items-center gap-3"><span className="hidden text-xs text-slate-500 sm:inline">Meta Business API</span><StatusPill ok={state.connected}>{state.connected ? "Connected" : "Not connected"}</StatusPill></div></div></header>
    <main className="mx-auto max-w-6xl px-5 py-8 md:py-12">
      {loading ? <div className="grid min-h-[55vh] place-items-center text-sm text-slate-500">Checking connection…</div> : !state.connected ? <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="overflow-hidden rounded-2xl border border-line bg-white shadow-card"><div className="border-b border-line px-6 py-4"><p className="m-0 text-xs font-medium text-slate-500">Meta App · The President Hotel</p></div><div className="px-6 py-12 md:px-12 md:py-16"><div className="mb-7 grid h-12 w-12 place-items-center rounded-xl bg-mint text-moss"><svg viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="1.8"><path d="M7 11V8a5 5 0 0 1 10 0v3M5 11h14v9H5z"/><path d="M12 15v2"/></svg></div><p className="m-0 text-[11px] font-bold uppercase tracking-[.18em] text-moss">Secure authorization</p><h1 className="mb-0 mt-3 max-w-xl text-3xl font-semibold tracking-tight md:text-4xl">Connect Your Meta Business</h1><p className="mb-0 mt-4 max-w-2xl text-base leading-7 text-slate-600">Securely connect your Meta Business portfolio to Avernek to configure business integrations and automation services.</p>{error && <div className="mt-6"><ErrorBox title="Connection unavailable" error={error} /><button type="button" onClick={() => { setError(null); setLoading(true); void loadSession(); }} className="mt-3 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-950 hover:bg-amber-50">Retry API connection</button></div>}{!error && !state.configured && <div className="mt-6"><ErrorBox title="Setup required" error={{ message: "Add VITE_META_CONFIG_ID, META_APP_SECRET, SESSION_SECRET, FRONTEND_URL, and BACKEND_URL to .env, then restart the app." }} /></div>}<button disabled={!state.configured} onClick={() => window.location.assign("/api/auth/meta/start")} className="mt-8 rounded-lg bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d4b39] disabled:cursor-not-allowed disabled:bg-slate-300">Connect Meta Business <span aria-hidden="true" className="ml-2">→</span></button><div className="mt-7 flex gap-3 border-t border-line pt-5 text-sm leading-6 text-slate-500"><span aria-hidden="true">ⓘ</span><p className="m-0">Your business information is only accessed after authorization through Meta.</p></div></div></section>
        <Walkthrough state={state} details={details} />
      </div> : <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6"><section><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="m-0 text-[11px] font-bold uppercase tracking-[.18em] text-moss">Authorized connection</p><h1 className="mb-0 mt-2 text-3xl font-semibold tracking-tight">Business dashboard</h1><p className="mb-0 mt-2 text-sm text-slate-500">Signed in{state.profile?.name ? ` as ${state.profile.name}` : " through Meta"}.</p></div><div className="flex gap-2"><button disabled={busy} onClick={refresh} className="rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-50 disabled:opacity-50">Refresh information</button><button disabled={busy} onClick={disconnect} className="rounded-lg px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50">Disconnect</button></div></div></section>
          {error && <ErrorBox title="Request failed" error={error} />}
          {state.graphErrors && Object.entries(state.graphErrors).map(([key, value]) => <ErrorBox key={key} title={`${key} request failed`} error={value} />)}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><label htmlFor="business" className="text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Accessible business portfolio</label>{businesses.length ? <select id="business" value={state.selectedBusinessId ?? ""} disabled={busy} onChange={(e) => void selectBusiness(e.target.value)} className="mt-3 w-full rounded-lg border border-line bg-white px-4 py-3 text-sm font-medium"><option value="" disabled>Select a portfolio</option>{businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}</select> : <p className="mb-0 mt-3 text-sm leading-6 text-slate-600">Meta returned no accessible business portfolios. Confirm the account has a role on a Business Portfolio and that <code>business_management</code> is granted.</p>}</section>
          {details && <><section className="grid gap-3 sm:grid-cols-3"><div className="rounded-xl border border-line bg-white p-4"><p className="m-0 text-xs text-slate-500">Portfolio name</p><p className="mb-0 mt-2 text-sm font-semibold">{details.business.name}</p></div><div className="rounded-xl border border-line bg-white p-4"><p className="m-0 text-xs text-slate-500">Business ID</p><p className="mb-0 mt-2 break-all font-mono text-xs font-semibold">{details.business.id}</p></div><div className="rounded-xl border border-line bg-white p-4"><p className="m-0 text-xs text-slate-500">Verification status</p><p className="mb-0 mt-2 text-sm font-semibold">{details.business.verification_status ?? "Not returned by Meta"}</p></div></section><section className="rounded-2xl border border-line bg-white p-5 shadow-card"><div className="mb-4"><p className="m-0 text-[11px] font-bold uppercase tracking-[.16em] text-moss">Authorized assets</p><h2 className="mb-0 mt-1 text-lg font-semibold">Live Graph API results</h2></div><div className="space-y-3">{details.assets.map((asset) => <AssetCard key={asset.key} asset={asset} />)}</div></section></>}
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="m-0 text-xs text-slate-500">API connection</p><p className="mb-0 mt-1 text-sm font-semibold">{state.token?.valid ? "Token validated by Meta" : "Token validation unavailable"}</p></div><StatusPill ok={Boolean(state.token?.valid)}>{state.token?.type ?? "Unknown token type"}</StatusPill></div><div className="mt-5 border-t border-line pt-4"><p className="m-0 text-xs font-semibold uppercase tracking-[.12em] text-slate-500">Granted permissions</p><div className="mt-3 flex flex-wrap gap-2">{granted.length ? granted.map((p) => <span key={p.permission} className="rounded-md bg-mint px-2.5 py-1.5 font-mono text-xs text-moss">{p.permission}</span>) : <span className="text-sm text-slate-500">No granted permissions were returned.</span>}</div></div></section>
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><h2 className="m-0 text-sm font-semibold text-blue-950">Why business_management is used</h2><p className="mb-0 mt-2 text-sm leading-6 text-blue-900">Avernek uses this permission to discover business portfolios the authorized administrator can access, read the selected portfolio, and enumerate business-owned assets needed to configure integrations. This demo performs read-only requests and never starts WhatsApp onboarding, QR scanning, phone registration, or migration.</p></section>
        </div><Walkthrough state={state} details={details} />
      </div>}
    </main><footer className="mx-auto max-w-6xl px-5 pb-8 pt-2 text-xs text-slate-500">Avernek Technologies Pvt. Ltd. · Read-only Meta App Review demo</footer>
  </div>;
}
