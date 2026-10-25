import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { HttpError } from "../utils.js";

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

/** Verifies the Bearer token and loads the (active) user onto req.user. */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Authentication required");

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret);
  } catch {
    throw new HttpError(401, "Session expired, please sign in again");
  }

  const { rows } = await query("SELECT id, name, email, role, bio, active FROM users WHERE id = $1", [Number(payload.sub)]);
  const user = rows[0];
  if (!user || !user.active) throw new HttpError(401, "Account is disabled or no longer exists");
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) throw new HttpError(403, "You do not have permission to do that");
  next();
};
