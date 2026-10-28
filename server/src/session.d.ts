import "express-session";
import type { ApiError, Business, Permission, Profile, TokenMetadata } from "./types.js";

declare module "express-session" {
  interface SessionData {
    oauthState?: string;
    accessToken?: string;
    profile?: Profile;
    permissions?: Permission[];
    businesses?: Business[];
    selectedBusinessId?: string;
    tokenMetadata?: TokenMetadata;
    graphErrors?: Record<string, ApiError>;
  }
}
