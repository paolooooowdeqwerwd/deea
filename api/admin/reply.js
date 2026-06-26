import { readBody, sendError, sendJson, getBearerToken } from "../_util.js"
import { verifyToken } from "../_auth.js"
import { getPool, initDb } from "../_db.js"

const requireAdmin = (req, res) => {
  const token = getBearerToken(req)
  const payload = verifyToken(token)
  if (!payload) {
    sendError(res, 401, "Unauthorized")
    return null
  }
  if (payload.role !== "admin") {
    sendError(res, 403, "Forbidden")
    return null
  }
  return payload
}

export default async function handler(req, res) {
  if (req.method !== "POST") return sendError(res, 405, "Method not allowed")
  const auth = requireAdmin(req, res)
  if (!auth) return

  await initDb()
  const pool = getPool()

  const body = await readBody(req)
  if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

  const message = body.message ? String(body.message).slice(0, 4000) : ""
  if (!message.trim()) return sendError(res, 400, "Empty message")

  const sent_at = new Date().toISOString()
  const insert = await pool.query(
    `INSERT INTO deea_messages (direction, mood_label, mood_emoji, message, sent_at)
     VALUES ('admin', $1, $2, $3, $4)
     RETURNING id, direction, mood_label, mood_emoji, message, sent_at`,
    ["Risposta", "💌", message.trim(), sent_at]
  )
  return sendJson(res, 201, { message: insert.rows[0] })
}
