// Shared SELECT fragments and row → JSON mappers so every route returns the same shape.

export const ARTICLE_SELECT = `
  SELECT a.*, u.name AS author_name, s.name AS section_name
  FROM articles a
  LEFT JOIN users u ON u.id = a.author_id
  LEFT JOIN sections s ON s.slug = a.section_slug`;

export const toArticle = (r, { withBody = true } = {}) => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  dek: r.dek,
  kicker: r.kicker,
  section: r.section_slug,
  sectionName: r.section_name,
  region: r.region,
  image: r.image_url,
  imageAlt: r.image_alt,
  author: r.byline || r.author_name || "Rapid Response Africa",
  byline: r.byline,
  authorId: r.author_id,
  authorName: r.author_name,
  status: r.status,
  featured: r.featured,
  readMinutes: r.read_minutes,
  publishedAt: r.published_at,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(withBody ? { body: r.body } : {}),
});

export const BRIEFING_SELECT = `
  SELECT b.*, u.name AS author_name
  FROM briefings b
  LEFT JOIN users u ON u.id = b.author_id`;

export const toBriefing = (r) => ({
  id: r.id,
  title: r.title,
  summary: r.summary,
  region: r.region,
  link: r.link,
  published: r.published,
  authorId: r.author_id,
  authorName: r.author_name,
  occurredAt: r.occurred_at,
  createdAt: r.created_at,
});

export const toUser = (r) => ({
  id: r.id,
  name: r.name,
  email: r.email,
  role: r.role,
  bio: r.bio,
  active: r.active,
  lastLoginAt: r.last_login_at,
  createdAt: r.created_at,
  ...(r.article_count !== undefined ? { articleCount: r.article_count } : {}),
});
