import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { query } from "../db/pool.js";
import { HttpError } from "../utils.js";

export const signToken = (user) =>
  jwt.sign({ sub: String(user.id), role: user.role, tv: user.token_version ?? 0 }, config.jwtSecret, {
    algorithm: "HS256",
    expiresIn: config.jwtExpiresIn,
  });

/** Verifies the Bearer token and loads the (active) user onto req.user. */
export async function requireAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) throw new HttpError(401, "Authentication required");

  let payload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] });
  } catch {
    throw new HttpError(401, "Session expired, please sign in again");
  }

  const { rows } = await query("SELECT id, name, email, role, bio, active, token_version FROM users WHERE id = $1", [Number(payload.sub)]);
  const user = rows[0];
  if (!user || !user.active) throw new HttpError(401, "Account is disabled or no longer exists");
  // Tokens issued before a password change / reset are no longer valid.
  if ((payload.tv ?? 0) !== user.token_version) throw new HttpError(401, "Session expired, please sign in again");
  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, _res, next) => {
  if (!roles.includes(req.user?.role)) throw new HttpError(403, "You do not have permission to do that");
  next();
};
