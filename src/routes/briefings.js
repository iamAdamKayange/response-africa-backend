import { Router } from "express";
import { query } from "../db/pool.js";
import { BRIEFING_SELECT, toBriefing } from "../serializers.js";
import { fields, HttpError, intParam, setClause } from "../utils.js";

// Situational briefings. Any signed-in user can post; authors edit/delete only their own.

const router = Router();

const spec = (partial) => ({
  title: { required: !partial, max: 160 },
  summary: { max: 600 },
  region: { max: 40 },
  link: { max: 500, url: "link" },
  published: { type: "boolean" },
  occurredAt: { type: "date" },
});

const toColumns = (d) => {
  const cols = {};
  if (d.title !== undefined) cols.title = d.title;
  if (d.summary !== undefined) cols.summary = d.summary;
  if (d.region !== undefined) cols.region = d.region || "Continental";
  if (d.link !== undefined) cols.link = d.link || null;
  if (d.published !== undefined) cols.published = d.published;
  if (d.occurredAt !== undefined) cols.occurred_at = d.occurredAt;
  return cols;
};

async function loadOwned(req) {
  const { rows } = await query(`${BRIEFING_SELECT} WHERE b.id = $1`, [Number(req.params.id)]);
  if (!rows[0]) throw new HttpError(404, "Briefing not found");
  if (req.user.role !== "admin" && rows[0].author_id !== req.user.id) throw new HttpError(403, "You can only manage your own briefings");
  return rows[0];
}

router.get("/", async (req, res) => {
  const limit = intParam(req.query.limit, 100, 200);
  const { rows } = await query(`${BRIEFING_SELECT} ORDER BY b.occurred_at DESC LIMIT ${limit}`);
  res.json({ briefings: rows.map(toBriefing) });
});

router.post("/", async (req, res) => {
  const cols = { ...toColumns(fields(req.body, spec(false))), author_id: req.user.id };
  const keys = Object.keys(cols);
  const { rows } = await query(
    `INSERT INTO briefings (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
    keys.map((k) => cols[k])
  );
  const created = await query(`${BRIEFING_SELECT} WHERE b.id = $1`, [rows[0].id]);
  res.status(201).json({ briefing: toBriefing(created.rows[0]) });
});

router.put("/:id", async (req, res) => {
  const existing = await loadOwned(req);
  const cols = toColumns(fields(req.body, spec(true)));
  if (Object.keys(cols).length) {
    const { sql, params } = setClause(cols, 2);
    await query(`UPDATE briefings SET ${sql}, updated_at = NOW() WHERE id = $1`, [existing.id, ...params]);
  }
  const updated = await query(`${BRIEFING_SELECT} WHERE b.id = $1`, [existing.id]);
  res.json({ briefing: toBriefing(updated.rows[0]) });
});

router.delete("/:id", async (req, res) => {
  const existing = await loadOwned(req);
  await query("DELETE FROM briefings WHERE id = $1", [existing.id]);
  res.status(204).end();
});

export default router;
