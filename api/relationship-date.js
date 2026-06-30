import { readBody, sendError, sendJson, getBearerToken } from "./_util.js"
import { verifyToken } from "./_auth.js"
import { getPool, initDb } from "./_db.js"

const requireUser = (req, res) => {
  const token = getBearerToken(req)
  const payload = verifyToken(token)
  if (!payload) {
    sendError(res, 401, "Unauthorized")
    return null
  }
  if (payload.role !== "user" && payload.role !== "admin") {
    sendError(res, 403, "Forbidden")
    return null
  }
  return payload
}

export default async function handler(req, res) {
  try {
    const auth = requireUser(req, res)
    if (!auth) return

    await initDb()
    const pool = getPool()

    if (req.method === "GET") {
      const result = await pool.query(
        `SELECT relationship_start_date, updated_at
         FROM deea_settings
         WHERE id = 1`
      )
      const row = result.rows?.[0] || null
      return sendJson(res, 200, {
        start_date: row?.relationship_start_date ? new Date(row.relationship_start_date).toISOString().slice(0, 10) : null,
        updated_at: row?.updated_at || null,
      })
    }

    if (req.method === "PUT") {
      if (auth.role !== "user") return sendError(res, 403, "Forbidden")

      const body = await readBody(req)
      if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

      const start_date = body.start_date ? String(body.start_date) : ""
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date)) return sendError(res, 400, "Invalid date format")

      const updated = await pool.query(
        `UPDATE deea_settings
         SET relationship_start_date = $1, updated_at = now()
         WHERE id = 1
         RETURNING relationship_start_date, updated_at`,
        [start_date]
      )
      const row = updated.rows[0]
      return sendJson(res, 200, {
        start_date: row.relationship_start_date ? new Date(row.relationship_start_date).toISOString().slice(0, 10) : null,
        updated_at: row.updated_at || null,
      })
    }

    if (req.method === "DELETE") {
      if (auth.role !== "user") return sendError(res, 403, "Forbidden")
      const updated = await pool.query(
        `UPDATE deea_settings
         SET relationship_start_date = NULL, updated_at = now()
         WHERE id = 1
         RETURNING relationship_start_date, updated_at`
      )
      const row = updated.rows[0]
      return sendJson(res, 200, {
        start_date: row.relationship_start_date ? new Date(row.relationship_start_date).toISOString().slice(0, 10) : null,
        updated_at: row.updated_at || null,
      })
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
