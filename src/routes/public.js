import { randomBytes } from "node:crypto";
import express, { Router } from "express";
import rateLimit from "express-rate-limit";
import { query } from "../db/pool.js";
import { sendWelcome } from "../email/newsletter.js";
import { unsubscribePage } from "../email/templates.js";
import { ARTICLE_SELECT, BRIEFING_SELECT, toArticle, toBriefing } from "../serializers.js";
import { fields, HttpError, intParam } from "../utils.js";

const router = Router();

router.get("/sections", async (_req, res) => {
  const { rows } = await query("SELECT slug, name, description FROM sections ORDER BY position, name");
  res.json({ sections: rows });
});

/** Published articles. Filters: ?section=&region=&q=&featured=true&limit=&offset= */
router.get("/articles", async (req, res) => {
  const where = ["a.status = 'published'"];
  const params = [];
  const add = (clause, value) => {
    params.push(value);
    where.push(clause.replace("?", `$${params.length}`));
  };

  if (req.query.section) add("a.section_slug = ?", String(req.query.section));
  if (req.query.region) add("a.region = ?", String(req.query.region));
  if (req.query.featured === "true") where.push("a.featured = TRUE");
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    const i = params.length;
    where.push(`(a.title ILIKE $${i} OR a.dek ILIKE $${i} OR a.kicker ILIKE $${i})`);
  }

  const limit = intParam(req.query.limit, 30);
  const offset = intParam(req.query.offset, 0, 100_000);
  const withBody = req.query.body === "true";

  const { rows } = await query(
    `${ARTICLE_SELECT} WHERE ${where.join(" AND ")}
     ORDER BY a.featured DESC, a.published_at DESC NULLS LAST
     LIMIT ${limit} OFFSET ${offset}`,
    params
  );
  res.json({ articles: rows.map((r) => toArticle(r, { withBody })) });
});

router.get("/articles/:slug", async (req, res) => {
  const { rows } = await query(`${ARTICLE_SELECT} WHERE a.slug = $1 AND a.status = 'published'`, [req.params.slug]);
  if (!rows[0]) throw new HttpError(404, "Article not found");
  res.json({ article: toArticle(rows[0]) });
});

router.get("/briefings", async (req, res) => {
  const limit = intParam(req.query.limit, 20);
  const { rows } = await query(`${BRIEFING_SELECT} WHERE b.published = TRUE ORDER BY b.occurred_at DESC LIMIT ${limit}`);
  res.json({ briefings: rows.map(toBriefing) });
});

const subscribeLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: "draft-8", legacyHeaders: false });

router.post("/subscribers", subscribeLimiter, async (req, res) => {
  const { email } = fields(req.body, { email: { required: true, email: true, max: 254 } });
  // New address, or someone who unsubscribed coming back: (re)activate and send the welcome email.
  // Existing active subscribers get the same response, so the form never reveals who is subscribed.
  const { rows } = await query(
    `INSERT INTO subscribers (email, token) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET unsubscribed_at = NULL, created_at = CASE WHEN subscribers.unsubscribed_at IS NOT NULL THEN NOW() ELSE subscribers.created_at END
       WHERE subscribers.unsubscribed_at IS NOT NULL
     RETURNING token`,
    [email, randomBytes(24).toString("hex")]
  );
  if (rows[0]) sendWelcome(email, rows[0].token).catch((e) => console.error("[email] welcome:", e.message));
  res.status(201).json({ ok: true });
});

const unsubscribe = async (token) => {
  if (!token || typeof token !== "string") return false;
  const { rowCount } = await query(
    "UPDATE subscribers SET unsubscribed_at = COALESCE(unsubscribed_at, NOW()) WHERE token = $1",
    [token]
  );
  return rowCount > 0;
};

/** Link in every email (GET) and the one-click List-Unsubscribe button in Gmail/Apple Mail (POST). */
router.get("/unsubscribe", async (req, res) => {
  const ok = await unsubscribe(req.query.token);
  res.status(ok ? 200 : 404).type("html").send(unsubscribePage(ok));
});
router.post("/unsubscribe", express.urlencoded({ extended: false }), async (req, res) => {
  const ok = await unsubscribe(req.query.token || req.body?.token);
  res.status(ok ? 200 : 404).type("html").send(unsubscribePage(ok));
});

export default router;
