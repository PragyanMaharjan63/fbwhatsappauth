export type ApiError = { message: string; code?: number; type?: string; traceId?: string };
export type Business = { id: string; name: string; verification_status?: string };
export type Permission = { permission: string; status: string };
export type SessionState = {
  configured: boolean;
  connected: boolean;
  profile?: { id: string; name?: string };
  permissions: Permission[];
  businesses: Business[];
  selectedBusinessId?: string;
  token?: { valid: boolean; type?: string; expiresAt?: number };
  graphErrors?: Record<string, ApiError>;
};
export type AssetResult = {
  key: string;
  label: string;
  endpoint: string;
  requiredPermissions: string[];
  note: string;
  data?: Array<Record<string, unknown>>;
  error?: ApiError;
};
export type BusinessDetails = { business: Business; assets: AssetResult[] };
