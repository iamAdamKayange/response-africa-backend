import { Router } from "express";
import { query } from "../db/pool.js";
import { ARTICLE_SELECT, toArticle } from "../serializers.js";
import { fields, HttpError, intParam, readMinutes, setClause, slugify } from "../utils.js";

// Admin/Author article management. Mounted behind requireAuth.
//  - Authors see and edit only their own articles, and can only save as "draft" or submit for "review".
//  - Admins see everything, publish/unpublish, feature, and delete anything.

const router = Router();

const isAdmin = (req) => req.user.role === "admin";

const articleSpec = (partial) => ({
  title: { required: !partial, max: 200 },
  slug: { max: 100 },
  dek: { max: 400 },
  kicker: { max: 60 },
  section: { required: !partial, max: 40 },
  region: { max: 40 },
  image: { max: 1000 },
  imageAlt: { max: 300 },
  body: {},
  byline: { max: 80 },
  status: { oneOf: ["draft", "review", "published"] },
  featured: { type: "boolean" },
  publishedAt: { type: "date" },
});

/** Maps API field names to DB columns, enforcing role rules. */
async function toColumns(req, data, existing) {
  if (!isAdmin(req)) {
    if (data.status === "published") throw new HttpError(403, "Only an admin can publish. Submit for review instead.");
    delete data.featured;
    delete data.publishedAt;
  }

  const cols = {};
  if (data.title !== undefined) cols.title = data.title;
  if (data.dek !== undefined) cols.dek = data.dek;
  if (data.kicker !== undefined) cols.kicker = data.kicker;
  if (data.section !== undefined) cols.section_slug = data.section;
  if (data.region !== undefined) cols.region = data.region || "Continental";
  if (data.image !== undefined) cols.image_url = data.image;
  if (data.imageAlt !== undefined) cols.image_alt = data.imageAlt;
  if (data.byline !== undefined) cols.byline = data.byline || null;
  if (data.featured !== undefined) cols.featured = data.featured;
  if (data.status !== undefined) cols.status = data.status;
  if (data.body !== undefined) {
    cols.body = data.body;
    cols.read_minutes = readMinutes(data.body);
  }

  if (data.slug !== undefined || (!existing && data.title)) {
    cols.slug = await uniqueSlug(slugify(data.slug || data.title), existing?.id);
  }

  // Stamp the publish time the first time an article goes live (or when an admin sets it explicitly).
  if (data.publishedAt) cols.published_at = data.publishedAt;
  else if (cols.status === "published" && !existing?.published_at) cols.published_at = new Date().toISOString();

  return cols;
}

async function uniqueSlug(base, ignoreId) {
  let slug = base;
  for (let n = 2; ; n++) {
    const { rows } = await query("SELECT id FROM articles WHERE slug = $1 AND ($2::int IS NULL OR id <> $2)", [slug, ignoreId ?? null]);
    if (!rows.length) return slug;
    slug = `${base}-${n}`;
  }
}

async function loadOwned(req) {
  const { rows } = await query(`${ARTICLE_SELECT} WHERE a.id = $1`, [Number(req.params.id)]);
  const row = rows[0];
  if (!row) throw new HttpError(404, "Article not found");
  if (!isAdmin(req) && row.author_id !== req.user.id) throw new HttpError(403, "You can only manage your own articles");
  return row;
}

router.get("/", async (req, res) => {
  const where = [];
  const params = [];
  if (!isAdmin(req)) {
    params.push(req.user.id);
    where.push(`a.author_id = $${params.length}`);
  }
  if (req.query.status) {
    params.push(String(req.query.status));
    where.push(`a.status = $${params.length}`);
  }
  if (req.query.section) {
    params.push(String(req.query.section));
    where.push(`a.section_slug = $${params.length}`);
  }
  if (req.query.q) {
    params.push(`%${req.query.q}%`);
    where.push(`(a.title ILIKE $${params.length} OR a.kicker ILIKE $${params.length})`);
  }
  const limit = intParam(req.query.limit, 50, 200);
  const offset = intParam(req.query.offset, 0, 100_000);

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const [{ rows }, count] = await Promise.all([
    query(`${ARTICLE_SELECT} ${whereSql} ORDER BY a.updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params),
    query(`SELECT COUNT(*) AS total FROM articles a ${whereSql}`, params),
  ]);
  res.json({ articles: rows.map((r) => toArticle(r, { withBody: false })), total: count.rows[0].total });
});

router.get("/:id", async (req, res) => {
  res.json({ article: toArticle(await loadOwned(req)) });
});

router.post("/", async (req, res) => {
  const data = fields(req.body, articleSpec(false));
  const cols = await toColumns(req, { status: "draft", ...data });
  cols.author_id = req.user.id;

  const keys = Object.keys(cols);
  const { rows } = await query(
    `INSERT INTO articles (${keys.join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
    keys.map((k) => cols[k])
  );
  const created = await query(`${ARTICLE_SELECT} WHERE a.id = $1`, [rows[0].id]);
  res.status(201).json({ article: toArticle(created.rows[0]) });
});

router.put("/:id", async (req, res) => {
  const existing = await loadOwned(req);
  if (!isAdmin(req) && existing.status === "published") {
    throw new HttpError(403, "This article is live. Ask an admin to make changes.");
  }
  const cols = await toColumns(req, fields(req.body, articleSpec(true)), existing);
  if (Object.keys(cols).length) {
    const { sql, params } = setClause(cols, 2);
    await query(`UPDATE articles SET ${sql}, updated_at = NOW() WHERE id = $1`, [existing.id, ...params]);
  }
  const updated = await query(`${ARTICLE_SELECT} WHERE a.id = $1`, [existing.id]);
  res.json({ article: toArticle(updated.rows[0]) });
});

router.delete("/:id", async (req, res) => {
  const existing = await loadOwned(req);
  if (!isAdmin(req) && existing.status === "published") {
    throw new HttpError(403, "Published articles can only be removed by an admin");
  }
  await query("DELETE FROM articles WHERE id = $1", [existing.id]);
  res.status(204).end();
});

export default router;
