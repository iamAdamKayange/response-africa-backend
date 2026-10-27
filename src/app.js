import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { query } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/error.js";
import admin from "./routes/admin.js";
import auth from "./routes/auth.js";
import publicRoutes from "./routes/public.js";
import { media } from "./routes/uploads.js";

export const app = express();

app.set("trust proxy", 1); // Behind Nginx (or Render); needed for rate limiting by real IP and https URLs.
app.use(helmet());

// Origins that are always allowed besides CORS_ORIGIN: the production domains (site, www, admin…)
// and the Vercel URLs (incl. previews) of the website and admin projects.
const BUILT_IN_ORIGINS = [
  /^https:\/\/([a-z0-9-]+\.)?rapid-response\.africa$/,
  /^https:\/\/(rapid-response-africa|admin-response-africa)[\w-]*\.vercel\.app$/,
];

app.use(
  cors({
    origin(origin, cb) {
      // Requests without an Origin header are server-to-server (e.g. the website's own server rendering).
      if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) return cb(null, true);
      if (BUILT_IN_ORIGINS.some((re) => re.test(origin))) return cb(null, true);
      console.warn(`[cors] blocked origin ${origin}; add it to CORS_ORIGIN if it is yours`);
      cb(null, false);
    },
  })
);
app.use(express.json({ limit: "1mb" }));

app.get("/", (_req, res) => res.json({ name: "The Rapid Response Africa API", status: "ok", docs: "/api/health" }));

app.get("/api/health", async (_req, res) => {
  const { rows } = await query("SELECT NOW() AS now");
  res.json({ status: "ok", database: "connected", time: rows[0].now });
});

app.use("/api/media", media);
app.use("/api/auth", auth);
app.use("/api/admin", admin);
app.use("/api", publicRoutes);

app.use(notFound);
app.use(errorHandler);
