import { readBody, sendError, sendJson, getBearerToken } from "./_util.js"
import { verifyToken } from "./_auth.js"
import { getPool, initDb } from "./_db.js"

const requireAuth = (req, res, allowedRoles) => {
  const token = getBearerToken(req)
  const payload = verifyToken(token)
  if (!payload) {
    sendError(res, 401, "Unauthorized")
    return null
  }
  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    sendError(res, 403, "Forbidden")
    return null
  }
  return payload
}

export default async function handler(req, res) {
  await initDb()
  const pool = getPool()

  if (req.method === "GET") {
    const auth = requireAuth(req, res, ["user", "admin"])
    if (!auth) return

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
    const order = url.searchParams.get("order") === "asc" ? "asc" : "desc"
    const since = url.searchParams.get("since")

    const values = []
    let where = ""
    if (since) {
      where = "WHERE sent_at > $1"
      values.push(since)
    }

    const result = await pool.query(
      `SELECT id, direction, mood_label, mood_emoji, message, sent_at
       FROM deea_messages
       ${where}
       ORDER BY sent_at ${order === "asc" ? "ASC" : "DESC"}`,
      values
    )
    return sendJson(res, 200, { messages: result.rows })
  }

  if (req.method === "POST") {
    const auth = requireAuth(req, res, ["user"])
    if (!auth) return

    const body = await readBody(req)
    if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

    const mood_label = body.mood_label ? String(body.mood_label).slice(0, 64) : null
    const mood_emoji = body.mood_emoji ? String(body.mood_emoji).slice(0, 16) : null
    const message = body.message ? String(body.message).slice(0, 4000) : null
    const sent_at = body.sent_at ? String(body.sent_at) : new Date().toISOString()

    if (!mood_label && !message) return sendError(res, 400, "Empty message")

    const insert = await pool.query(
      `INSERT INTO deea_messages (direction, mood_label, mood_emoji, message, sent_at)
       VALUES ('user', $1, $2, $3, $4)
       RETURNING id, direction, mood_label, mood_emoji, message, sent_at`,
      [mood_label, mood_emoji, message, sent_at]
    )
    return sendJson(res, 201, { message: insert.rows[0] })
  }

  return sendError(res, 405, "Method not allowed")
}
