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

-- Newsletter: each subscriber gets a secret token for one-click unsubscribe links.
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS token TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;
UPDATE subscribers SET token = md5(random()::text || id::text || clock_timestamp()::text) || md5(random()::text)
WHERE token IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscribers_token_idx ON subscribers (token);

-- Articles are emailed once, the first time they go live. When this column is first added, every
-- article that is already published is marked as sent, so turning email on never mails old stories.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_name = 'articles' AND column_name = 'notified_at'
  ) THEN
    ALTER TABLE articles ADD COLUMN notified_at TIMESTAMPTZ;
    UPDATE articles SET notified_at = COALESCE(published_at, NOW()) WHERE status = 'published';
  END IF;
END $$;

-- One row per newsletter send (article alert, daily brief, test), shown in the admin panel.
CREATE TABLE IF NOT EXISTS email_sends (
  id          SERIAL PRIMARY KEY,
  kind        TEXT        NOT NULL CHECK (kind IN ('article', 'daily', 'test')),
  dedupe_key  TEXT        UNIQUE,
  subject     TEXT        NOT NULL,
  article_id  INTEGER     REFERENCES articles(id) ON DELETE SET NULL,
  status      TEXT        NOT NULL DEFAULT 'sending' CHECK (status IN ('sending', 'sent', 'partial', 'failed', 'skipped')),
  recipients  INTEGER     NOT NULL DEFAULT 0,
  delivered   INTEGER     NOT NULL DEFAULT 0,
  failed      INTEGER     NOT NULL DEFAULT 0,
  note        TEXT,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS email_sends_started_idx ON email_sends (started_at DESC);

-- Only one lead story: keep the most recently published one if several are flagged (idempotent).
UPDATE articles SET featured = FALSE
WHERE featured AND id <> (
  SELECT id FROM articles WHERE featured ORDER BY published_at DESC NULLS LAST, id DESC LIMIT 1
);
