import { randomBytes } from "node:crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 (S3-compatible) image storage. Optional: when the R2_* variables are missing,
// uploads are disabled and editors can still paste image URLs.

const env = process.env;
export const storageEnabled = Boolean(env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET);

const s3 = storageEnabled
  ? new S3Client({
      region: "auto",
      endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
    })
  : null;

const publicBase = (env.R2_PUBLIC_URL || "").replace(/\/$/, "");

export const ALLOWED_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

/** Uploads an image and returns its storage key. */
export async function putImage(buffer, contentType, nameHint = "image") {
  const now = new Date();
  const safeName = String(nameHint).toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "image";
  const key = `articles/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomBytes(6).toString("hex")}-${safeName}.${ALLOWED_TYPES[contentType]}`;
  await s3.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return key;
}

/**
 * Public URL for a stored key: the bucket's public domain (r2.dev or custom) when configured,
 * otherwise this API's /api/media proxy so uploads work before public access is switched on.
 */
export const publicUrl = (key, apiBase) => (publicBase ? `${publicBase}/${key}` : `${apiBase}/api/media/${key}`);

export const getImage = (key) => s3.send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
