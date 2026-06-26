const { readBody, sendJson, sendError } = require("../_util.cjs")
const { createToken } = require("../_auth.cjs")

const getEnv = (name) => process.env[name] ?? null

const getUserCredentials = () => {
  const name = getEnv("DEEA_NAME") || getEnv("VITE_DEEA_NAME") || ""
  const password = getEnv("DEEA_PASSWORD") || getEnv("VITE_DEEA_PASSWORD") || ""
  return { name, password }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return sendError(res, 405, "Method not allowed")

  const body = await readBody(req)
  if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

  const { name, password } = body
  const creds = getUserCredentials()
  if (!creds.name || !creds.password) return sendError(res, 500, "Missing server credentials")

  if (String(name || "").trim().toLowerCase() !== creds.name.trim().toLowerCase() || String(password || "") !== creds.password) {
    return sendError(res, 401, "Invalid credentials")
  }

  const token = createToken({ role: "user", ttlSeconds: 60 * 60 * 24 * 30 })
  return sendJson(res, 200, { token, role: "user" })
}
