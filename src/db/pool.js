import pg from "pg";
import { config } from "../config.js";

// Return COUNT(*) / bigint values as JS numbers.
pg.types.setTypeParser(20, (v) => Number(v));

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: Number(process.env.PG_POOL_MAX) || 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 15_000,
});

pool.on("error", (err) => console.error("[db] idle client error", err.message));

export const query = (text, params) => pool.query(text, params);
