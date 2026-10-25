import { Router } from "express";
import { query } from "../db/pool.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { ARTICLE_SELECT, toArticle } from "../serializers.js";
import { HttpError } from "../utils.js";
import articles from "./articles.js";
import briefings from "./briefings.js";
import users from "./users.js";

const router = Router();
router.use(requireAuth);

/** Dashboard numbers. Authors get counts for their own work only. */
router.get("/stats", async (req, res) => {
  const own = req.user.role !== "admin";
  const filter = own ? "WHERE author_id = $1" : "";
  const params = own ? [req.user.id] : [];

  const [byStatus, recent, subs, team, briefs] = await Promise.all([
    query(`SELECT status, COUNT(*) AS n FROM articles ${filter} GROUP BY status`, params),
    query(`${ARTICLE_SELECT} ${own ? "WHERE a.author_id = $1" : ""} ORDER BY a.updated_at DESC LIMIT 6`, params),
    own ? null : query("SELECT COUNT(*) AS n, COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS week FROM subscribers"),
    own ? null : query("SELECT COUNT(*) AS n FROM users WHERE active"),
    query(`SELECT COUNT(*) AS n FROM briefings ${filter}`, params),
  ]);

  const counts = { draft: 0, review: 0, published: 0 };
  for (const r of byStatus.rows) counts[r.status] = r.n;

  res.json({
    articles: { ...counts, total: counts.draft + counts.review + counts.published },
    briefings: briefs.rows[0].n,
    subscribers: subs ? { total: subs.rows[0].n, lastWeek: subs.rows[0].week } : null,
    team: team ? team.rows[0].n : null,
    recent: recent.rows.map((r) => toArticle(r, { withBody: false })),
  });
});

router.get("/sections", async (_req, res) => {
  const { rows } = await query("SELECT slug, name FROM sections ORDER BY position, name");
  res.json({ sections: rows });
});

router.use("/articles", articles);
router.use("/briefings", briefings);
router.use("/users", requireRole("admin"), users);

router.get("/subscribers", requireRole("admin"), async (req, res) => {
  const { rows } = await query("SELECT id, email, source, created_at FROM subscribers ORDER BY created_at DESC");
  if (req.query.format === "csv") {
    res.type("text/csv").attachment("subscribers.csv");
    return res.send(["email,source,subscribed_at", ...rows.map((r) => `${r.email},${r.source},${new Date(r.created_at).toISOString()}`)].join("\n"));
  }
  res.json({ subscribers: rows.map((r) => ({ id: r.id, email: r.email, source: r.source, createdAt: r.created_at })) });
});

router.delete("/subscribers/:id", requireRole("admin"), async (req, res) => {
  const { rowCount } = await query("DELETE FROM subscribers WHERE id = $1", [Number(req.params.id)]);
  if (!rowCount) throw new HttpError(404, "Subscriber not found");
  res.status(204).end();
});

export default router;
