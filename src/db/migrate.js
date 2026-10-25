import { readFile } from "node:fs/promises";
import { pool } from "./pool.js";

const sql = await readFile(new URL("./schema.sql", import.meta.url), "utf8");

try {
  await pool.query(sql);
  console.log("[migrate] schema is up to date");
} catch (err) {
  console.error("[migrate] failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
