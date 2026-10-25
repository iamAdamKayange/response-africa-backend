import cors from "cors";
import express from "express";
import helmet from "helmet";
import { config } from "./config.js";
import { query } from "./db/pool.js";
import { errorHandler, notFound } from "./middleware/error.js";
import admin from "./routes/admin.js";
import auth from "./routes/auth.js";
import publicRoutes from "./routes/public.js";

export const app = express();

app.set("trust proxy", 1); // Render sits behind a proxy; needed for rate limiting by real IP.
app.use(helmet());
app.use(
  cors({
    origin(origin, cb) {
      // Allow server-to-server calls (no Origin header), the configured sites, and the Vercel URLs
      // (incl. previews) of the website and the admin panel projects.
      if (!origin || config.corsOrigins.includes(origin) || config.corsOrigins.includes("*")) return cb(null, true);
      if (/^https:\/\/(rapid-response-africa|admin-response-africa)[\w-]*\.vercel\.app$/.test(origin)) return cb(null, true);
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

app.use("/api/auth", auth);
app.use("/api/admin", admin);
app.use("/api", publicRoutes);

app.use(notFound);
app.use(errorHandler);
