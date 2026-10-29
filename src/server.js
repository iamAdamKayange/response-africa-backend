import { app } from "./app.js";
import { config } from "./config.js";
import { pool } from "./db/pool.js";
import { startDailyBriefScheduler } from "./email/newsletter.js";

const server = app.listen(config.port, () => {
  console.log(`[api] listening on http://localhost:${config.port}`);
  startDailyBriefScheduler();
});

const shutdown = (signal) => {
  console.log(`[api] ${signal} received, shutting down`);
  server.close(() => pool.end().then(() => process.exit(0)));
};
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
