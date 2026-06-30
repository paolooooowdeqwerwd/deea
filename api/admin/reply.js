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
  try {
    const auth = requireAdmin(req, res)
    if (!auth) return

    await initDb()
    const pool = getPool()

    if (req.method === "POST") {
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

    if (req.method === "DELETE") {
      const body = await readBody(req)
      if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

      const id = body.id ? String(body.id) : ""
      if (!id) return sendError(res, 400, "Missing id")

      const deleted = await pool.query(
        `DELETE FROM deea_messages
         WHERE id = $1 AND direction = 'admin'
         RETURNING id`,
        [id]
      )
      if (!deleted.rowCount) return sendError(res, 404, "Not found")
      return sendJson(res, 200, { ok: true, id: deleted.rows[0].id })
    }

    return sendError(res, 405, "Method not allowed")
  } catch (e) {
    const msg = String(e?.message || "")
    if (msg.includes("Missing database connection string")) {
      return sendError(res, 500, "Database non configurato su Vercel (Postgres non collegato).")
    }
    if (msg.includes("Missing DEEA_JWT_SECRET") || msg.includes("Missing AUTH_SECRET")) {
      return sendError(res, 500, "Secret auth mancante su Vercel (DEEA_JWT_SECRET o AUTH_SECRET).")
    }
    return sendError(res, 500, "Errore server. Controlla log Vercel Functions.")
  }
}
