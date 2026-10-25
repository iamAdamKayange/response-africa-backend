import bcrypt from "bcryptjs";
import { Router } from "express";
import { query } from "../db/pool.js";
import { toUser } from "../serializers.js";
import { fields, HttpError, setClause } from "../utils.js";

// Team management. Mounted behind requireAuth + requireRole("admin").

const router = Router();

router.get("/", async (_req, res) => {
  const { rows } = await query(`
    SELECT u.*, (SELECT COUNT(*) FROM articles a WHERE a.author_id = u.id) AS article_count
    FROM users u ORDER BY u.role, u.name`);
  res.json({ users: rows.map(toUser) });
});

router.post("/", async (req, res) => {
  const d = fields(req.body, {
    name: { required: true, max: 120 },
    email: { required: true, email: true, max: 254 },
    password: { required: true, min: 8, max: 200 },
    role: { oneOf: ["admin", "author"] },
    bio: { max: 1000 },
  });
  const hash = await bcrypt.hash(d.password, 12);
  const { rows } = await query(
    "INSERT INTO users (name, email, password_hash, role, bio) VALUES ($1, $2, $3, $4, $5) RETURNING *",
    [d.name, d.email, hash, d.role || "author", d.bio || ""]
  );
  res.status(201).json({ user: toUser(rows[0]) });
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const d = fields(req.body, {
    name: { max: 120 },
    email: { email: true, max: 254 },
    password: { min: 8, max: 200 },
    role: { oneOf: ["admin", "author"] },
    bio: { max: 1000 },
    active: { type: "boolean" },
  });

  if (id === req.user.id && (d.role === "author" || d.active === false)) {
    throw new HttpError(400, "You cannot demote or disable your own account");
  }

  const cols = {};
  for (const k of ["name", "email", "role", "bio", "active"]) if (d[k] !== undefined) cols[k] = d[k];
  if (d.password) cols.password_hash = await bcrypt.hash(d.password, 12);
  if (!Object.keys(cols).length) throw new HttpError(400, "Nothing to update");

  const { sql, params } = setClause(cols, 2);
  const { rows } = await query(`UPDATE users SET ${sql}, updated_at = NOW() WHERE id = $1 RETURNING *`, [id, ...params]);
  if (!rows[0]) throw new HttpError(404, "User not found");
  res.json({ user: toUser(rows[0]) });
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (id === req.user.id) throw new HttpError(400, "You cannot delete your own account");
  const { rowCount } = await query("DELETE FROM users WHERE id = $1", [id]);
  if (!rowCount) throw new HttpError(404, "User not found");
  res.status(204).end();
});

export default router;
