import { readBody, sendError, sendJson } from "../_util.js"
import { createToken } from "../_auth.js"

const getEnv = (name) => process.env[name] ?? null

export default async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Method not allowed")

  const body = await readBody(req)
  if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

  const adminPassword = getEnv("DEEA_ADMIN_PASSWORD") || getEnv("VITE_DEEA_ADMIN_PASSWORD") || ""
  if (!adminPassword) return sendError(res, 500, "Missing server admin password")

  const { password } = body
  if (String(password || "") !== adminPassword) return sendError(res, 401, "Invalid credentials")

  const token = createToken({ role: "admin", ttlSeconds: 60 * 60 * 24 * 30 })
  return sendJson(res, 200, { token, role: "admin" })
}
