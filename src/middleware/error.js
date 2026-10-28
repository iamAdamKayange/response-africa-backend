import { HttpError } from "../utils.js";

export function notFound(req, _res, next) {
  next(new HttpError(404, `Not found: ${req.method} ${req.path}`));
}

// Express recognises error handlers by their 4 arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err.type === "entity.parse.failed") err = new HttpError(400, "Invalid JSON body");
  if (err.code === "23505") err = new HttpError(409, "That value is already in use");
  if (err.code === "23503") err = new HttpError(400, "A referenced record does not exist");

  const status = err.status || err.statusCode || 500;
  // Our own HttpErrors carry user-facing messages; anything unexpected is logged and hidden.
  const expected = err instanceof HttpError || status < 500;
  if (!expected) console.error("[error]", err);
  res.status(status).json({ error: expected ? err.message : "Something went wrong", details: expected ? err.details : undefined });
}
