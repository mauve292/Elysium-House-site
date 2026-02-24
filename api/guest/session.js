const crypto = require("crypto");

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;
  return Buffer.from(padded, "base64");
}

function parseCookies(rawCookie) {
  const output = {};
  if (!rawCookie) {
    return output;
  }

  rawCookie.split(";").forEach((part) => {
    const trimmed = part.trim();
    if (!trimmed) {
      return;
    }
    const idx = trimmed.indexOf("=");
    if (idx === -1) {
      return;
    }
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    output[key] = value;
  });

  return output;
}

function timingSafeEqualText(left, right) {
  const leftBuf = Buffer.from(left, "utf8");
  const rightBuf = Buffer.from(right, "utf8");
  if (leftBuf.length !== rightBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(leftBuf, rightBuf);
}

function verifyToken(token, secret) {
  if (typeof token !== "string") {
    return null;
  }

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return null;
  }

  const payloadPart = parts[0];
  const signaturePart = parts[1];
  const expectedSignature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(payloadPart).digest()
  );

  if (!timingSafeEqualText(signaturePart, expectedSignature)) {
    return null;
  }

  try {
    const payloadJson = base64UrlDecode(payloadPart).toString("utf8");
    return JSON.parse(payloadJson);
  } catch (error) {
    return null;
  }
}

module.exports = function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const slugEnv = process.env.EH_GUEST_SLUG;
  const secret = process.env.EH_GUEST_SECRET;

  if (!slugEnv || !secret) {
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }

  const cookies = parseCookies(req.headers.cookie || "");
  const token = cookies.eh_guest;
  const payload = verifyToken(token, secret);
  const now = Math.floor(Date.now() / 1000);

  if (
    payload &&
    payload.slug === slugEnv &&
    typeof payload.exp === "number" &&
    payload.exp >= now
  ) {
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: false });
};
