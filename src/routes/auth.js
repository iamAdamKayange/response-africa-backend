import bcrypt from "bcryptjs";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { query } from "../db/pool.js";
import { requireAuth, signToken } from "../middleware/auth.js";
import { toUser } from "../serializers.js";
import { fields, HttpError, setClause } from "../utils.js";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again in a few minutes." },
});

router.post("/login", loginLimiter, async (req, res) => {
  const { email, password } = fields(req.body, {
    email: { required: true, email: true },
    password: { required: true },
  });

  const { rows } = await query("SELECT * FROM users WHERE email = $1", [email]);
  const user = rows[0];
  const ok = user && (await bcrypt.compare(password, user.password_hash));
  if (!ok) throw new HttpError(401, "Incorrect email or password");
  if (!user.active) throw new HttpError(403, "This account has been disabled");

  await query("UPDATE users SET last_login_at = NOW() WHERE id = $1", [user.id]);
  res.json({ token: signToken(user), user: toUser(user) });
});

router.get("/me", requireAuth, (req, res) => {
  res.json({ user: toUser(req.user) });
});

/** Update your own profile; changing the password requires the current one. */
router.put("/me", requireAuth, async (req, res) => {
  const data = fields(req.body, {
    name: { max: 120 },
    bio: { max: 1000 },
    currentPassword: {},
    newPassword: { min: 8, max: 200 },
  });

  const updates = {};
  if (data.name) updates.name = data.name;
  if (data.bio !== undefined) updates.bio = data.bio;

  if (data.newPassword) {
    const { rows } = await query("SELECT password_hash FROM users WHERE id = $1", [req.user.id]);
    if (!data.currentPassword || !(await bcrypt.compare(data.currentPassword, rows[0].password_hash))) {
      throw new HttpError(400, "Current password is incorrect");
    }
    updates.password_hash = await bcrypt.hash(data.newPassword, 12);
  }

  if (!Object.keys(updates).length) return res.json({ user: toUser(req.user) });

  const { sql, params } = setClause(updates, 2);
  const { rows } = await query(`UPDATE users SET ${sql}, updated_at = NOW() WHERE id = $1 RETURNING *`, [req.user.id, ...params]);
  res.json({ user: toUser(rows[0]) });
});

export default router;
