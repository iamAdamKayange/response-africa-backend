import { config } from "../config.js";

// Branded, table-based HTML emails with inline styles (what Gmail, Outlook and phone mail apps render reliably).
// Every value that comes from the database goes through esc().

const NAVY = "#0a1a31";
const GOLD = "#c69f54";
const INK = "#14171c";
const MUTED = "#6b7280";
const PAPER = "#faf8f4";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

const site = () => config.email.siteUrl;
export const articleUrl = (a) => `${site()}/article/${encodeURIComponent(a.slug)}`;
/** The 1200x630 card image the website renders for each story. */
const cardImage = (a) => `${site()}/og/${encodeURIComponent(a.slug)}?v=mail${a.id}`;
export const unsubscribeUrl = (token) => `${config.email.apiUrl}/api/unsubscribe?token=${encodeURIComponent(token)}`;

/** Headers that give Gmail / Apple Mail a one-click "Unsubscribe" button. */
export const unsubscribeHeaders = (token) => ({
  "List-Unsubscribe": `<${unsubscribeUrl(token)}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

const dateLabel = (d = new Date()) =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: config.email.timeZone }).format(d);

function layout({ preheader, body, token }) {
  const unsub = token ? unsubscribeUrl(token) : `${site()}/`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>The Rapid Response Africa</title>
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e2dccf;">
<tr><td style="background:${NAVY};padding:20px 28px;">
  <table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td style="padding-right:14px;"><img src="${site()}/images/logo.jpeg" width="44" height="44" alt="" style="display:block;border:0;"></td>
    <td style="border-left:1px solid ${GOLD};padding-left:14px;">
      <div style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:2px;color:#ffffff;text-transform:uppercase;">The Rapid Response <span style="color:${GOLD};">Africa</span></div>
      <div style="font-family:${SANS};font-size:10px;letter-spacing:3px;color:#c9ced8;text-transform:uppercase;margin-top:4px;">Africa. In context.</div>
    </td>
  </tr></table>
</td></tr>
${body}
<tr><td style="padding:24px 28px;border-top:1px solid #eee9df;font-family:${SANS};font-size:12px;line-height:1.6;color:${MUTED};">
  You are receiving this because you subscribed at <a href="${site()}" style="color:${MUTED};">rapid-response.africa</a>.<br>
  Follow @Africans24 on X, Instagram, Facebook, TikTok, YouTube and LinkedIn.<br>
  <a href="${unsub}" style="color:${MUTED};">Unsubscribe</a>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

const button = (href, label) =>
  `<a href="${href}" style="display:inline-block;background:${GOLD};color:${NAVY};font-family:${SANS};font-size:15px;font-weight:700;text-decoration:none;padding:13px 24px;border-radius:3px;">${esc(label)}</a>`;

const kicker = (text) =>
  `<div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;color:#a8843d;text-transform:uppercase;">${esc(text)}</div>`;

/** Sent to every subscriber when a story is published. */
export function articleEmail(article, token) {
  const url = articleUrl(article);
  const body = `
<tr><td style="padding:0;"><a href="${url}"><img src="${cardImage(article)}" width="600" alt="${esc(article.image_alt || article.title)}" style="display:block;width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:28px 28px 8px;">
  ${kicker(article.kicker || article.section_name || "Analysis")}
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-size:28px;line-height:1.2;font-weight:normal;color:${INK};"><a href="${url}" style="color:${INK};text-decoration:none;">${esc(article.title)}</a></h1>
  ${article.dek ? `<p style="margin:12px 0 0;font-family:${SERIF};font-size:18px;line-height:1.5;color:#3b4250;">${esc(article.dek)}</p>` : ""}
  <p style="margin:14px 0 0;font-family:${SANS};font-size:13px;color:${MUTED};">${esc(article.byline || article.author_name || "Rapid Response Africa")} · ${article.read_minutes || 1} min read</p>
</td></tr>
<tr><td style="padding:20px 28px 32px;">${button(url, "Read the analysis")}</td></tr>`;
  return {
    subject: article.title,
    html: layout({ preheader: article.dek || article.title, body, token }),
    text: `${article.title}\n\n${article.dek || ""}\n\nRead: ${url}\n\nUnsubscribe: ${unsubscribeUrl(token)}`,
  };
}

/** The weekday-morning digest: yesterday's stories and briefings. */
export function dailyBriefEmail({ articles, briefings }, token) {
  const date = dateLabel();
  const lead = articles[0];
  const rest = articles.slice(1);
  const leadBlock = lead
    ? `<tr><td style="padding:0;"><a href="${articleUrl(lead)}"><img src="${cardImage(lead)}" width="600" alt="${esc(lead.image_alt || lead.title)}" style="display:block;width:100%;height:auto;border:0;"></a></td></tr>
<tr><td style="padding:24px 28px 4px;">
  ${kicker(lead.kicker || "Top story")}
  <h2 style="margin:8px 0 0;font-family:${SERIF};font-size:24px;line-height:1.25;font-weight:normal;"><a href="${articleUrl(lead)}" style="color:${INK};text-decoration:none;">${esc(lead.title)}</a></h2>
  ${lead.dek ? `<p style="margin:8px 0 0;font-family:${SERIF};font-size:16px;line-height:1.5;color:#3b4250;">${esc(lead.dek)}</p>` : ""}
</td></tr>`
    : "";
  const list = rest
    .map(
      (a) => `<tr><td style="padding:16px 28px 0;">
  <div style="border-top:1px solid #eee9df;padding-top:16px;">
  ${kicker(a.kicker || a.section_name || "Analysis")}
  <a href="${articleUrl(a)}" style="display:block;margin-top:6px;font-family:${SERIF};font-size:19px;line-height:1.3;color:${INK};text-decoration:none;">${esc(a.title)}</a>
  ${a.dek ? `<div style="margin-top:4px;font-family:${SANS};font-size:14px;line-height:1.5;color:#3b4250;">${esc(a.dek)}</div>` : ""}
  </div></td></tr>`
    )
    .join("");
  const briefs = briefings.length
    ? `<tr><td style="padding:28px 28px 0;">
  <div style="font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:3px;color:${INK};text-transform:uppercase;border-top:2px solid ${INK};padding-top:12px;">Situational briefings</div>
  ${briefings
    .map(
      (b) => `<div style="margin-top:14px;font-family:${SANS};font-size:14px;line-height:1.5;color:#3b4250;">
    <span style="font-size:11px;font-weight:700;letter-spacing:1px;color:#a8843d;text-transform:uppercase;">${esc(b.region)}</span><br>
    <strong style="color:${INK};">${esc(b.title)}</strong>${b.summary ? ` — ${esc(b.summary)}` : ""}
  </div>`
    )
    .join("")}
</td></tr>`
    : "";
  const body = `
<tr><td style="padding:24px 28px 16px;background:${PAPER};border-bottom:1px solid #eee9df;">
  <div style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:3px;color:#a8843d;text-transform:uppercase;">The Daily Brief</div>
  <div style="margin-top:6px;font-family:${SERIF};font-size:22px;color:${INK};">${esc(date)}</div>
</td></tr>
${leadBlock}${list}${briefs}
<tr><td style="padding:28px 28px 32px;">${button(site(), "More on rapid-response.africa")}</td></tr>`;
  const text = [
    `The Daily Brief — ${date}`,
    "",
    ...articles.map((a) => `• ${a.title}\n  ${articleUrl(a)}`),
    ...(briefings.length ? ["", "Situational briefings:", ...briefings.map((b) => `• [${b.region}] ${b.title}${b.summary ? ` — ${b.summary}` : ""}`)] : []),
    "",
    `Unsubscribe: ${unsubscribeUrl(token)}`,
  ].join("\n");
  return {
    subject: `The Daily Brief: ${lead ? lead.title : date}`,
    html: layout({ preheader: `${articles.length} new ${articles.length === 1 ? "story" : "stories"} · ${date}`, body, token }),
    text,
  };
}

/** Sent right after someone subscribes. */
export function welcomeEmail(latest, token) {
  const items = latest
    .map(
      (a) => `<li style="margin:0 0 10px;"><a href="${articleUrl(a)}" style="font-family:${SERIF};font-size:17px;color:${INK};text-decoration:none;">${esc(a.title)}</a></li>`
    )
    .join("");
  const body = `
<tr><td style="padding:32px 28px 8px;">
  ${kicker("Welcome")}
  <h1 style="margin:10px 0 0;font-family:${SERIF};font-size:28px;line-height:1.2;font-weight:normal;color:${INK};">You're subscribed.</h1>
  <p style="margin:14px 0 0;font-family:${SERIF};font-size:17px;line-height:1.6;color:#3b4250;">
    Thank you for joining The Rapid Response Africa. You will get each new analysis as soon as it is published,
    and The Daily Brief every weekday morning: verified news and policy clarity on diplomacy, governance,
    business and development across Africa.
  </p>
</td></tr>
${items ? `<tr><td style="padding:20px 28px 0;"><div style="font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:3px;color:${INK};text-transform:uppercase;">Latest analysis</div><ul style="margin:14px 0 0;padding-left:18px;">${items}</ul></td></tr>` : ""}
<tr><td style="padding:20px 28px 32px;">${button(site(), "Visit the website")}</td></tr>`;
  return {
    subject: "Welcome to The Rapid Response Africa",
    html: layout({ preheader: "You're subscribed. Here's what to expect.", body, token }),
    text: `You're subscribed to The Rapid Response Africa.\n\nYou'll get each new analysis when it's published and The Daily Brief every weekday morning.\n\n${site()}\n\nUnsubscribe: ${unsubscribeUrl(token)}`,
  };
}

/** Small confirmation page shown after clicking "Unsubscribe". */
export function unsubscribePage(ok) {
  const title = ok ? "You have been unsubscribed" : "This link is no longer valid";
  const text = ok
    ? "You will not receive any more emails from The Rapid Response Africa. You can subscribe again at any time on the website."
    : "The unsubscribe link is invalid or has already been used.";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title></head>
<body style="margin:0;background:${PAPER};font-family:${SANS};">
<div style="max-width:520px;margin:12vh auto;padding:32px 28px;background:#fff;border:1px solid #e2dccf;">
<div style="font-size:11px;font-weight:700;letter-spacing:3px;color:#a8843d;text-transform:uppercase;">The Rapid Response Africa</div>
<h1 style="font-family:${SERIF};font-weight:normal;color:${INK};font-size:26px;margin:12px 0 0;">${title}</h1>
<p style="color:#3b4250;line-height:1.6;">${text}</p>
<p><a href="${site()}" style="color:${NAVY};font-weight:600;">Back to rapid-response.africa</a></p>
</div></body></html>`;
}
