-- The Rapid Response Africa: database schema (idempotent, safe to run on every deploy)

CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'author' CHECK (role IN ('admin', 'author')),
  bio           TEXT        NOT NULL DEFAULT '',
  active        BOOLEAN     NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bumped whenever a password changes or an account is disabled, which signs out every existing session.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS sections (
  slug        TEXT PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT    NOT NULL DEFAULT '',
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS articles (
  id           SERIAL PRIMARY KEY,
  slug         TEXT        NOT NULL UNIQUE,
  title        TEXT        NOT NULL,
  dek          TEXT        NOT NULL DEFAULT '',
  kicker       TEXT        NOT NULL DEFAULT '',
  section_slug TEXT        NOT NULL REFERENCES sections(slug) ON UPDATE CASCADE,
  region       TEXT        NOT NULL DEFAULT 'Continental',
  image_url    TEXT        NOT NULL DEFAULT '',
  image_alt    TEXT        NOT NULL DEFAULT '',
  body         TEXT        NOT NULL DEFAULT '',
  byline       TEXT,
  status       TEXT        NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'published')),
  featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  author_id    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  read_minutes INTEGER     NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS articles_status_published_idx ON articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS articles_section_idx ON articles (section_slug);
CREATE INDEX IF NOT EXISTS articles_author_idx ON articles (author_id);

CREATE TABLE IF NOT EXISTS briefings (
  id          SERIAL PRIMARY KEY,
  title       TEXT        NOT NULL,
  summary     TEXT        NOT NULL DEFAULT '',
  region      TEXT        NOT NULL DEFAULT 'Continental',
  link        TEXT,
  published   BOOLEAN     NOT NULL DEFAULT TRUE,
  author_id   INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS briefings_occurred_idx ON briefings (occurred_at DESC);

CREATE TABLE IF NOT EXISTS subscribers (
  id         SERIAL PRIMARY KEY,
  email      TEXT        NOT NULL UNIQUE,
  source     TEXT        NOT NULL DEFAULT 'website',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one lead story: keep the most recently published one if several are flagged (idempotent).
UPDATE articles SET featured = FALSE
WHERE featured AND id <> (
  SELECT id FROM articles WHERE featured ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1
);
