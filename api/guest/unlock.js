const crypto = require("crypto");

const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

function base64UrlEncode(input) {
  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(String(input), "utf8");
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function parseJsonBody(body) {
  if (!body) {
    return {};
  }

  if (typeof body === "object") {
    return body;
  }

  if (typeof body === "string") {
    try {
      return JSON.parse(body);
    } catch (error) {
      return {};
    }
  }

  return {};
}

module.exports = function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const slugEnv = process.env.EH_GUEST_SLUG;
  const pinEnv = process.env.EH_GUEST_PIN;
  const secret = process.env.EH_GUEST_SECRET;

  if (!slugEnv || !pinEnv || !secret) {
    return res.status(500).json({ ok: false, error: "Server not configured" });
  }

  const body = parseJsonBody(req.body);
  const slug = typeof body.slug === "string" ? body.slug : "";
  const pin = typeof body.pin === "string" ? body.pin : "";

  if (slug !== slugEnv || pin !== pinEnv) {
    return res.status(401).json({ ok: false, error: "Invalid credentials" });
  }

  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS;
  const payload = base64UrlEncode(JSON.stringify({ slug, exp }));
  const signature = base64UrlEncode(
    crypto.createHmac("sha256", secret).update(payload).digest()
  );
  const token = payload + "." + signature;

  res.setHeader(
    "Set-Cookie",
    "eh_guest=" +
      token +
      "; HttpOnly; Secure; SameSite=Lax; Path=/guest/" +
      slugEnv +
      "; Max-Age=" +
      MAX_AGE_SECONDS
  );

  return res.status(200).json({ ok: true });
};
