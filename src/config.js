// Load ./.env when present (e.g. on the VPS under PM2). Variables already set in the environment win.
try {
  process.loadEnvFile();
} catch {}

const required = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const config = {
  port: Number(process.env.PORT) || 4000,
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",

  // Newsletter (optional): without RESEND_API_KEY nothing is emailed and sends are logged as "skipped".
  email: {
    resendKey: process.env.RESEND_API_KEY || "",
    resendUrl: (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, ""),
    from: process.env.EMAIL_FROM || "The Rapid Response Africa <brief@rapid-response.africa>",
    replyTo: process.env.EMAIL_REPLY_TO || "",
    siteUrl: (process.env.SITE_URL || "https://rapid-response.africa").replace(/\/$/, ""),
    apiUrl: (process.env.API_PUBLIC_URL || "https://api.rapid-response.africa").replace(/\/$/, ""),
    articleAlerts: process.env.EMAIL_ARTICLE_ALERTS !== "false",
    dailyBrief: process.env.DAILY_BRIEF_ENABLED !== "false",
    dailyBriefHour: Number(process.env.DAILY_BRIEF_HOUR ?? 7),
    timeZone: process.env.DAILY_BRIEF_TZ || "Africa/Nairobi",
  },
};

if (config.isProduction && config.jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be at least 32 characters in production");
}
