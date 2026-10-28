import { Router } from "express";
import multer from "multer";
import { ALLOWED_TYPES, getImage, publicUrl, putImage, storageEnabled } from "../storage.js";
import { HttpError } from "../utils.js";

export const MAX_UPLOAD_MB = 10;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED_TYPES[file.mimetype] ? cb(null, true) : cb(new HttpError(400, "Only JPG, PNG, WebP, GIF or AVIF images can be uploaded")),
});

/** Detects the real image type from the file's first bytes (the browser-declared type can be faked). */
function sniffImageType(buf) {
  const b = (i) => buf[i];
  const ascii = (start, end) => buf.subarray(start, end).toString("latin1");
  if (b(0) === 0xff && b(1) === 0xd8 && b(2) === 0xff) return "image/jpeg";
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b(i) === v)) return "image/png";
  if (ascii(0, 6) === "GIF87a" || ascii(0, 6) === "GIF89a") return "image/gif";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^(avif|avis)$/.test(ascii(8, 12))) return "image/avif";
  return null;
}

const apiBase = (req) => `${req.protocol}://${req.get("host")}`;

/** POST /api/admin/uploads (multipart, field "file") → { url, key }. Mounted behind requireAuth. */
export const uploads = Router();

uploads.post("/", (req, res, next) => {
  if (!storageEnabled) throw new HttpError(503, "Image uploads are not configured on the server (R2_* variables)");
  upload.single("file")(req, res, async (err) => {
    try {
      if (err?.code === "LIMIT_FILE_SIZE") throw new HttpError(413, `Images must be ${MAX_UPLOAD_MB} MB or smaller`);
      if (err) throw err;
      if (!req.file) throw new HttpError(400, 'Attach an image in the "file" field');
      const realType = sniffImageType(req.file.buffer);
      if (!realType) throw new HttpError(400, "That file is not a valid JPG, PNG, WebP, GIF or AVIF image");
      const key = await putImage(req.file.buffer, realType, req.file.originalname);
      res.status(201).json({ key, url: publicUrl(key, apiBase(req)) });
    } catch (e) {
      next(e);
    }
  });
});

/** GET /api/media/<key>: public read-through for uploads when the bucket has no public domain yet. */
export const media = Router();

media.get("/*key", async (req, res) => {
  if (!storageEnabled) throw new HttpError(404, "Not found");
  const key = [].concat(req.params.key).join("/");
  if (!key.startsWith("articles/") || key.includes("..")) throw new HttpError(404, "Not found");
  try {
    const obj = await getImage(key);
    res.set({
      "Content-Type": obj.ContentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
      ...(obj.ContentLength ? { "Content-Length": String(obj.ContentLength) } : {}),
    });
    obj.Body.pipe(res);
  } catch (e) {
    if (e.name === "NoSuchKey") throw new HttpError(404, "Not found");
    throw e;
  }
});
