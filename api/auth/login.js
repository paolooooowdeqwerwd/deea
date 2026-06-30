import { readBody, sendError, sendJson } from "../_util.js"
import { createToken } from "../_auth.js"

const getEnv = (name) => process.env[name] ?? null

const getUserCredentials = () => {
  const name = getEnv("DEEA_NAME") || getEnv("VITE_DEEA_NAME") || ""
  const password = getEnv("DEEA_PASSWORD") || getEnv("VITE_DEEA_PASSWORD") || ""
  return { name, password }
}

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") return sendError(res, 405, "Method not allowed")

    const body = await readBody(req)
    if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

    const { name, password } = body
    const creds = getUserCredentials()
    if (!creds.name || !creds.password) {
      return sendError(res, 500, "Credenziali server mancanti (DEEA_NAME/DEEA_PASSWORD).")
    }

    if (
      String(name || "").trim().toLowerCase() !== creds.name.trim().toLowerCase() ||
      String(password || "") !== creds.password
    ) {
      return sendError(res, 401, "Invalid credentials")
    }

    const token = createToken({ role: "user", ttlSeconds: 60 * 60 * 24 * 30 })
    return sendJson(res, 200, { token, role: "user" })
  } catch (e) {
    const msg = String(e?.message || "")
    if (msg.includes("Missing DEEA_JWT_SECRET") || msg.includes("Missing AUTH_SECRET")) {
      return sendError(res, 500, "Secret auth mancante su Vercel (DEEA_JWT_SECRET o AUTH_SECRET).")
    }
    return sendError(res, 500, "Errore server. Controlla log Vercel Functions.")
  }
}
