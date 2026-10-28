import app from "../server/src/index.js";

// Explicit serverless entrypoint for the static Vite + Express deployment.
// vercel.json rewrites every /api/* request here while preserving the public
// URL, so the existing Express routes continue to match /api/session, OAuth,
// business endpoints, and the health check.
export default app;
