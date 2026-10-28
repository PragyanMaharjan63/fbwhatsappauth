import express from "express";
import serverApp from "./server/src/index.js";

// Vercel detects Express applications from a recognized root entrypoint that
// imports Express directly. Mount the configured application on a root app so
// every original request path (including /api/*) reaches the existing router.
const app = express();
app.use(serverApp);

export default app;
