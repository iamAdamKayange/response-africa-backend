import { config } from "../config.js";

// Minimal Resend client (https://resend.com/docs/api-reference). Uses the batch endpoint, which takes
// up to 100 separate emails per request, so every subscriber gets their own message and unsubscribe link.

const BATCH_SIZE = 100;
const PAUSE_MS = 600; // Resend allows ~2 requests/second by default.
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const emailEnabled = () => Boolean(config.email.resendKey);

async function post(path, body) {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${config.email.resendUrl}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.email.resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    if (res.ok) return res.json();
    const text = await res.text().catch(() => "");
    // Back off on rate limits and transient server errors, a few times.
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      await sleep(attempt * 2_000);
      continue;
    }
    throw new Error(`Resend ${res.status}: ${text.slice(0, 300)}`);
  }
}

/**
 * Sends many emails. Each message: { to, subject, html, text, headers? }.
 * Returns { delivered, failed, errors } — failures in one batch do not stop the rest.
 */
export async function sendMany(messages) {
  let delivered = 0;
  let failed = 0;
  const errors = [];
  for (let i = 0; i < messages.length; i += BATCH_SIZE) {
    const chunk = messages.slice(i, i + BATCH_SIZE).map((m) => ({
      from: config.email.from,
      ...(config.email.replyTo ? { reply_to: config.email.replyTo } : {}),
      to: [m.to],
      subject: m.subject,
      html: m.html,
      text: m.text,
      headers: m.headers,
    }));
    try {
      await post("/emails/batch", chunk);
      delivered += chunk.length;
    } catch (e) {
      failed += chunk.length;
      errors.push(e.message);
      console.error("[email] batch failed:", e.message);
    }
    if (i + BATCH_SIZE < messages.length) await sleep(PAUSE_MS);
  }
  return { delivered, failed, errors };
}

export const sendOne = (message) => sendMany([message]);
