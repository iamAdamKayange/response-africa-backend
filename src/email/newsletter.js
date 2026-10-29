import { config } from "../config.js";
import { query } from "../db/pool.js";
import { ARTICLE_SELECT } from "../serializers.js";
import { emailEnabled, sendMany, sendOne } from "./resend.js";
import { articleEmail, dailyBriefEmail, unsubscribeHeaders, welcomeEmail } from "./templates.js";

// Every send is recorded in email_sends (shown in the admin panel). dedupe_key makes each article alert
// and each day's brief go out at most once, even if the server restarts or two requests race.

const activeSubscribers = async () =>
  (await query("SELECT email, token FROM subscribers WHERE unsubscribed_at IS NULL ORDER BY id")).rows;

/** Today's date (YYYY-MM-DD) in the newsroom's time zone. */
export const localDate = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: config.email.timeZone }).format(d);

async function startLog({ kind, subject, articleId = null, dedupeKey = null, recipients }) {
  const { rows } = await query(
    `INSERT INTO email_sends (kind, subject, article_id, dedupe_key, recipients) VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (dedupe_key) DO NOTHING RETURNING id`,
    [kind, subject, articleId, dedupeKey, recipients]
  );
  return rows[0]?.id ?? null;
}

const finishLog = (id, { status, delivered = 0, failed = 0, note = null }) =>
  query("UPDATE email_sends SET status = $2, delivered = $3, failed = $4, note = $5, finished_at = NOW() WHERE id = $1", [
    id,
    status,
    delivered,
    failed,
    note,
  ]);

/** Why a send would not go out right now, or null if it can. */
function blocker(kind, recipients) {
  if (!emailEnabled()) return "Email is not set up on the server (RESEND_API_KEY missing)";
  if (kind === "article" && !config.email.articleAlerts) return "Article alerts are turned off (EMAIL_ARTICLE_ALERTS=false)";
  if (!recipients) return "No active subscribers";
  return null;
}

/** Sends in the background and records the outcome; the caller gets a summary immediately. */
function deliver(logId, subscribers, build) {
  const messages = subscribers.map((s) => ({ to: s.email, ...build(s.token), headers: unsubscribeHeaders(s.token) }));
  sendMany(messages)
    .then(({ delivered, failed, errors }) =>
      finishLog(logId, { status: failed === 0 ? "sent" : delivered === 0 ? "failed" : "partial", delivered, failed, note: errors[0] ?? null })
    )
    .catch((e) => finishLog(logId, { status: "failed", failed: messages.length, note: e.message }));
}

/**
 * Emails a story to every subscriber the first time it is published.
 * Returns { status: "sending" | "skipped", recipients, note } or null if it was already sent.
 */
export async function notifyArticle(articleId) {
  // Claim the article atomically so it is only ever mailed once.
  const claimed = await query(
    "UPDATE articles SET notified_at = NOW() WHERE id = $1 AND status = 'published' AND notified_at IS NULL RETURNING id",
    [articleId]
  );
  if (!claimed.rowCount) return null;

  const article = (await query(`${ARTICLE_SELECT} WHERE a.id = $1`, [articleId])).rows[0];
  const subscribers = await activeSubscribers();
  const logId = await startLog({ kind: "article", subject: article.title, articleId, dedupeKey: `article-${articleId}`, recipients: subscribers.length });
  if (!logId) return null;

  const reason = blocker("article", subscribers.length);
  if (reason) {
    await finishLog(logId, { status: "skipped", note: reason });
    return { status: "skipped", recipients: subscribers.length, note: reason };
  }
  deliver(logId, subscribers, (token) => articleEmail(article, token));
  return { status: "sending", recipients: subscribers.length };
}

/**
 * The Daily Brief: stories and briefings published since the last brief (at most 3 days back, so
 * Monday's edition covers the weekend). Goes out once per day. Returns a summary.
 */
export async function sendDailyBrief() {
  const today = localDate();
  const last = await query("SELECT MAX(started_at) AS t FROM email_sends WHERE kind = 'daily' AND status IN ('sent', 'partial')");
  const since = new Date(Math.max(last.rows[0].t ? new Date(last.rows[0].t).getTime() : 0, Date.now() - 72 * 3600_000));
  const fallback = new Date(Date.now() - 24 * 3600_000);
  const from = last.rows[0].t ? since : fallback;

  const [articles, briefings, subscribers] = await Promise.all([
    query(`${ARTICLE_SELECT} WHERE a.status = 'published' AND a.published_at > $1 ORDER BY a.featured DESC, a.published_at DESC LIMIT 12`, [from]),
    query("SELECT title, summary, region FROM briefings WHERE published AND occurred_at > $1 ORDER BY occurred_at DESC LIMIT 8", [from]),
    activeSubscribers(),
  ]);

  const subject = articles.rows[0] ? `The Daily Brief: ${articles.rows[0].title}` : `The Daily Brief, ${today}`;
  const logId = await startLog({ kind: "daily", subject, dedupeKey: `daily-${today}`, recipients: subscribers.length });
  if (!logId) return { status: "already-sent", note: "Today's Daily Brief has already gone out" };

  if (!articles.rowCount && !briefings.rowCount) {
    await finishLog(logId, { status: "skipped", note: "Nothing new was published since the last brief" });
    return { status: "skipped", note: "Nothing new was published since the last brief" };
  }
  const reason = blocker("daily", subscribers.length);
  if (reason) {
    await finishLog(logId, { status: "skipped", note: reason });
    return { status: "skipped", recipients: subscribers.length, note: reason };
  }
  const content = { articles: articles.rows, briefings: briefings.rows };
  deliver(logId, subscribers, (token) => dailyBriefEmail(content, token));
  return { status: "sending", recipients: subscribers.length, articles: articles.rowCount, briefings: briefings.rowCount };
}

/** Welcome email for a new subscriber (fire-and-forget; failures are only logged). */
export async function sendWelcome(email, token) {
  if (!emailEnabled()) return;
  const latest = (await query(`${ARTICLE_SELECT} WHERE a.status = 'published' ORDER BY a.published_at DESC NULLS LAST LIMIT 3`)).rows;
  const { failed, errors } = await sendOne({ to: email, ...welcomeEmail(latest, token), headers: unsubscribeHeaders(token) });
  if (failed) console.error("[email] welcome failed:", errors[0]);
}

/** Sends one copy of the latest story to the signed-in admin, to check the setup and the design. */
export async function sendTest(to) {
  if (!emailEnabled()) return { status: "skipped", note: "Email is not set up on the server (RESEND_API_KEY missing)" };
  const article = (await query(`${ARTICLE_SELECT} WHERE a.status = 'published' ORDER BY a.published_at DESC NULLS LAST LIMIT 1`)).rows[0];
  if (!article) return { status: "skipped", note: "Publish at least one article first" };
  const logId = await startLog({ kind: "test", subject: `[Test] ${article.title}`, articleId: article.id, recipients: 1 });
  const msg = articleEmail(article, "test-token");
  const result = await sendOne({ to, ...msg, subject: `[Test] ${msg.subject}` });
  await finishLog(logId, { status: result.failed ? "failed" : "sent", delivered: result.delivered, failed: result.failed, note: result.errors[0] ?? null });
  return result.failed ? { status: "failed", note: result.errors[0] } : { status: "sent", to };
}

/** Checks every minute and sends the Daily Brief once, on weekdays, from DAILY_BRIEF_HOUR (local time). */
export function startDailyBriefScheduler() {
  if (!config.email.dailyBrief) return console.log("[email] daily brief disabled");
  const tick = async () => {
    try {
      const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", { timeZone: config.email.timeZone, weekday: "short", hour: "2-digit", hourCycle: "h23" })
          .formatToParts(new Date())
          .map((p) => [p.type, p.value])
      );
      const hour = Number(parts.hour);
      const weekday = !["Sat", "Sun"].includes(parts.weekday);
      // A three-hour window, so a restart at 07:30 still sends, but a server started in the evening does not.
      if (weekday && hour >= config.email.dailyBriefHour && hour < config.email.dailyBriefHour + 3) {
        const exists = await query("SELECT 1 FROM email_sends WHERE dedupe_key = $1", [`daily-${localDate()}`]);
        if (!exists.rowCount) {
          const result = await sendDailyBrief();
          console.log("[email] daily brief:", JSON.stringify(result));
        }
      }
    } catch (e) {
      console.error("[email] daily brief check failed:", e.message);
    }
  };
  setTimeout(tick, 15_000).unref();
  setInterval(tick, 60_000).unref();
  console.log(`[email] daily brief scheduled for weekdays ${config.email.dailyBriefHour}:00 ${config.email.timeZone}`);
}
