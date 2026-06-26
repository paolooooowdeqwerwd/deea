const { readBody, sendJson, sendError, getBearerToken } = require("./_util.cjs")
const { verifyToken } = require("./_auth.cjs")
const { getPool, initDb } = require("./_db.cjs")

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

module.exports = async (req, res) => {
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
}
