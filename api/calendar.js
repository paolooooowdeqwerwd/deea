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

const toIsoDate = (v) => {
  if (!v) return null
  if (typeof v === "string") return v.slice(0, 10)
  try {
    return new Date(v).toISOString().slice(0, 10)
  } catch {
    return null
  }
}

export default async function handler(req, res) {
  try {
    const auth = requireAuth(req, res, ["user", "admin"])
    if (!auth) return

    await initDb()
    const pool = getPool()

    if (req.method === "GET") {
      const url = new URL(req.url, `http://${req.headers.host || "localhost"}`)
      const month = url.searchParams.get("month") || ""
      if (!/^\d{4}-\d{2}$/.test(month)) return sendError(res, 400, "Invalid month")

      const start = `${month}-01`
      const endRes = await pool.query(`SELECT (date_trunc('month', $1::date) + interval '1 month - 1 day')::date as last_day`, [
        start,
      ])
      const end = toIsoDate(endRes.rows?.[0]?.last_day)
      if (!end) return sendError(res, 400, "Invalid month")

      const { rows } = await pool.query(
        `SELECT date, love_count, prelim_him, prelim_her, came_him, came_her, updated_at
         FROM deea_calendar_events
         WHERE date >= $1::date AND date <= $2::date
         ORDER BY date ASC`,
        [start, end]
      )

      const totalsRes = await pool.query(
        `SELECT
           COALESCE(SUM(love_count), 0) as love_count,
           COALESCE(SUM(prelim_him), 0) as prelim_him,
           COALESCE(SUM(prelim_her), 0) as prelim_her,
           COALESCE(SUM(came_him), 0) as came_him,
           COALESCE(SUM(came_her), 0) as came_her
         FROM deea_calendar_events`
      )

      const totals = totalsRes.rows?.[0] || {}
      return sendJson(res, 200, {
        month,
        range: { start, end },
        totals: {
          love_count: Number(totals.love_count || 0),
          prelim_him: Number(totals.prelim_him || 0),
          prelim_her: Number(totals.prelim_her || 0),
          came_him: Number(totals.came_him || 0),
          came_her: Number(totals.came_her || 0),
        },
        events: rows.map((r) => ({
          date: toIsoDate(r.date),
          love_count: Number(r.love_count || 0),
          prelim_him: Number(r.prelim_him || 0),
          prelim_her: Number(r.prelim_her || 0),
          came_him: Number(r.came_him || 0),
          came_her: Number(r.came_her || 0),
          updated_at: r.updated_at || null,
        })),
      })
    }

    if (req.method === "POST") {
      if (auth.role !== "user") return sendError(res, 403, "Forbidden")
      const body = await readBody(req)
      if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

      const date = body.date ? String(body.date) : ""
      const type = body.type ? String(body.type) : ""
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return sendError(res, 400, "Invalid date")

      const allowed = new Set(["love", "prelim_him", "prelim_her", "came_him", "came_her"])
      if (!allowed.has(type)) return sendError(res, 400, "Invalid type")

      const column =
        type === "love"
          ? "love_count"
          : type === "prelim_him"
            ? "prelim_him"
            : type === "prelim_her"
              ? "prelim_her"
              : type === "came_him"
                ? "came_him"
                : "came_her"

      const upsert = await pool.query(
        `INSERT INTO deea_calendar_events (date, ${column})
         VALUES ($1::date, 1)
         ON CONFLICT (date) DO UPDATE
         SET ${column} = deea_calendar_events.${column} + 1,
             updated_at = now()
         RETURNING date, love_count, prelim_him, prelim_her, came_him, came_her, updated_at`,
        [date]
      )
      const row = upsert.rows?.[0]
      return sendJson(res, 200, {
        event: {
          date: toIsoDate(row?.date),
          love_count: Number(row?.love_count || 0),
          prelim_him: Number(row?.prelim_him || 0),
          prelim_her: Number(row?.prelim_her || 0),
          came_him: Number(row?.came_him || 0),
          came_her: Number(row?.came_her || 0),
          updated_at: row?.updated_at || null,
        },
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
