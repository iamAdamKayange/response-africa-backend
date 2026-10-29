// Seeds sections, the demo admin/author accounts and sample content.
// Safe to re-run: existing users are kept as they are, and sample articles/briefings
// are only added when those tables are empty.
import bcrypt from "bcryptjs";
import { readMinutes } from "../utils.js";
import { pool } from "./pool.js";
import { sampleArticles, sampleBriefings, sections } from "./seed-data.js";

const env = (key, fallback) => process.env[key] || fallback;

async function upsertUser({ name, email, password, role }) {
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role) VALUES ($1, LOWER($2), $3, $4)
     ON CONFLICT (email) DO UPDATE SET email = EXCLUDED.email
     RETURNING id, (xmax = 0) AS created`,
    [name, email, hash, role]
  );
  console.log(`[seed] ${role.padEnd(6)} ${email} ${rows[0].created ? "created" : "already exists (unchanged)"}`);
  return rows[0].id;
}

try {
  for (const [i, s] of sections.entries()) {
    await pool.query(
      `INSERT INTO sections (slug, name, description, position) VALUES ($1, $2, $3, $4)
       ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, position = EXCLUDED.position`,
      [s.slug, s.name, s.description, i]
    );
  }
  console.log(`[seed] ${sections.length} sections`);

  const adminId = await upsertUser({
    name: env("SEED_ADMIN_NAME", "Editor-in-Chief"),
    email: env("SEED_ADMIN_EMAIL", "admin@rapid-response.com"),
    password: env("SEED_ADMIN_PASSWORD", "Admin@2026!"),
    role: "admin",
  });
  const authorId = await upsertUser({
    name: env("SEED_AUTHOR_NAME", "Staff Writer"),
    email: env("SEED_AUTHOR_EMAIL", "author@rapid-response.com"),
    password: env("SEED_AUTHOR_PASSWORD", "Author@2026!"),
    role: "author",
  });

  const { rows: [{ n: articleCount }] } = await pool.query("SELECT COUNT(*) AS n FROM articles");
  if (articleCount === 0) {
    for (const [i, a] of sampleArticles.entries()) {
      await pool.query(
        `INSERT INTO articles (slug, title, dek, kicker, section_slug, region, image_url, image_alt, body, byline,
                               status, featured, author_id, read_minutes, published_at, notified_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'published',$11,$12,$13,$14,$14)`,
        [a.slug, a.title, a.dek, a.kicker, a.section, a.region, a.image, a.imageAlt, a.body, a.byline,
         i === 0, i % 3 === 0 ? authorId : adminId, readMinutes(a.body), a.publishedAt]
      );
    }
    console.log(`[seed] ${sampleArticles.length} sample articles`);
  } else {
    console.log(`[seed] articles table already has ${articleCount} rows, skipping sample articles`);
  }

  const { rows: [{ n: briefingCount }] } = await pool.query("SELECT COUNT(*) AS n FROM briefings");
  if (briefingCount === 0) {
    for (const b of sampleBriefings) {
      await pool.query(
        "INSERT INTO briefings (title, summary, region, link, author_id, occurred_at) VALUES ($1,$2,$3,$4,$5, NOW() - $6::interval)",
        [b.title, b.summary, b.region, b.link ?? null, adminId, b.ago]
      );
    }
    console.log(`[seed] ${sampleBriefings.length} sample briefings`);
  }

  console.log("[seed] done");
} catch (err) {
  console.error("[seed] failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
