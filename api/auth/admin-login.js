import { readBody, sendError, sendJson } from "../_util.js"
import { createToken } from "../_auth.js"

const getEnv = (name) => process.env[name] ?? null

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendError(res, 405, "Method not allowed")

    const body = await readBody(req)
    if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

    const adminPassword = getEnv("DEEA_ADMIN_PASSWORD") || getEnv("VITE_DEEA_ADMIN_PASSWORD") || ""
    if (!adminPassword) return sendError(res, 500, "Password admin server mancante (DEEA_ADMIN_PASSWORD).")

    const { password } = body
    if (String(password || "") !== adminPassword) return sendError(res, 401, "Invalid credentials")

    const token = createToken({ role: "admin", ttlSeconds: 60 * 60 * 24 * 30 })
    return sendJson(res, 200, { token, role: "admin" })
  } catch (e) {
    const msg = String(e?.message || "")
    if (msg.includes("Missing DEEA_JWT_SECRET") || msg.includes("Missing AUTH_SECRET")) {
      return sendError(res, 500, "Secret auth mancante su Vercel (DEEA_JWT_SECRET o AUTH_SECRET).")
    }
    return sendError(res, 500, "Errore server. Controlla log Vercel Functions.")
  }
}
