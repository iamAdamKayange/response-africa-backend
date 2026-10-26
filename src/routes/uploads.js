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
      const key = await putImage(req.file.buffer, req.file.mimetype, req.file.originalname);
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
