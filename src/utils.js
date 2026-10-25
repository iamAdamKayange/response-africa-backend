export class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const slugify = (text) =>
  String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "untitled";

export const readMinutes = (body) => Math.max(1, Math.round(String(body).split(/\s+/).filter(Boolean).length / 220));

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Picks the fields described by `spec` from a request body, trims strings and validates them.
 * Missing optional fields are left out so they can be used for partial updates.
 */
export function fields(body, spec) {
  const out = {};
  const errors = {};
  for (const [key, rule] of Object.entries(spec)) {
    let v = body?.[key];
    if (v === undefined || v === null) {
      if (rule.required) errors[key] = "is required";
      continue;
    }
    if (rule.type === "boolean") {
      out[key] = v === true || v === "true";
      continue;
    }
    if (rule.type === "date") {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) errors[key] = "must be a valid date";
      else out[key] = d.toISOString();
      continue;
    }
    v = String(v).trim();
    if (rule.required && !v) errors[key] = "is required";
    else if (rule.min && v.length < rule.min) errors[key] = `must be at least ${rule.min} characters`;
    else if (rule.max && v.length > rule.max) errors[key] = `must be at most ${rule.max} characters`;
    else if (rule.oneOf && v && !rule.oneOf.includes(v)) errors[key] = `must be one of: ${rule.oneOf.join(", ")}`;
    else if (rule.email && v && !EMAIL_RE.test(v)) errors[key] = "must be a valid email";
    else out[key] = rule.email ? v.toLowerCase() : v;
  }
  if (Object.keys(errors).length) throw new HttpError(400, "Validation failed", errors);
  return out;
}

export const intParam = (value, fallback, max = 100) => {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, max) : fallback;
};

/** Builds "col1 = $1, col2 = $2" for an UPDATE from a { column: value } map. */
export function setClause(values, startAt = 1) {
  const keys = Object.keys(values);
  return {
    sql: keys.map((k, i) => `${k} = $${i + startAt}`).join(", "),
    params: keys.map((k) => values[k]),
  };
}
