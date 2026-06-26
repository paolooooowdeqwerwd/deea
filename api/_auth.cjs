const crypto = require("crypto")

const base64url = (input) => {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input))
  return buf
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

const fromBase64url = (input) => {
  const normalized = String(input).replace(/-/g, "+").replace(/_/g, "/")
  const pad = normalized.length % 4 ? "=".repeat(4 - (normalized.length % 4)) : ""
  return Buffer.from(normalized + pad, "base64").toString("utf8")
}

const getSecret = () => {
  const s = process.env.DEEA_JWT_SECRET || process.env.AUTH_SECRET
  if (!s) throw new Error("Missing DEEA_JWT_SECRET (or AUTH_SECRET)")
  return s
}

const sign = (data) => {
  const h = crypto.createHmac("sha256", getSecret())
  h.update(data)
  return base64url(h.digest())
}

const createToken = ({ role, ttlSeconds }) => {
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    role,
    iat: now,
    exp: now + ttlSeconds,
  }
  const encoded = base64url(JSON.stringify(payload))
  const signature = sign(encoded)
  return `${encoded}.${signature}`
}

const verifyToken = (token) => {
  if (!token || typeof token !== "string") return null
  const parts = token.split(".")
  if (parts.length !== 2) return null
  const [encoded, signature] = parts
  const expected = sign(encoded)
  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return null
  if (!crypto.timingSafeEqual(a, b)) return null
  let payload = null
  try {
    payload = JSON.parse(fromBase64url(encoded))
  } catch {
    return null
  }
  const now = Math.floor(Date.now() / 1000)
  if (!payload?.exp || payload.exp <= now) return null
  if (!payload?.role) return null
  return payload
}

module.exports = { createToken, verifyToken }
