export type ApiError = { message: string; code?: number; type?: string; traceId?: string };
export type GraphResponse<T> = T & { error?: { message: string; type?: string; code?: number; fbtrace_id?: string }; paging?: unknown };
export type Profile = { id: string; name?: string };
export type Permission = { permission: string; status: string };
export type Business = { id: string; name: string; verification_status?: string };
export type TokenMetadata = { valid: boolean; type?: string; expiresAt?: number };
