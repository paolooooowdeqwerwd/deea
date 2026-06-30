import { readBody, sendError, sendJson, getBearerToken } from "./_util.js"
import { verifyToken } from "./_auth.js"
import { getPool, initDb } from "./_db.js"
import webPush from "web-push"

let vapidConfigured = false

const configureVapidIfPossible = () => {
  if (vapidConfigured) return true
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.WEB_PUSH_PUBLIC_KEY
  const privateKey = process.env.VAPID_PRIVATE_KEY || process.env.WEB_PUSH_PRIVATE_KEY
  if (!publicKey || !privateKey) return false
  const subject = process.env.VAPID_SUBJECT || "mailto:deea@example.com"
  webPush.setVapidDetails(subject, publicKey, privateKey)
  vapidConfigured = true
  return true
}

async function notifyAdmins(pool, messageRow) {
  if (!configureVapidIfPossible()) return
  const { rows } = await pool.query(
    `SELECT endpoint, subscription
     FROM deea_push_subscriptions
     WHERE role = 'admin'`
  )
  if (!rows?.length) return

  const body = messageRow?.message?.trim()
    ? `${messageRow.mood_emoji ?? ""} ${messageRow.mood_label ?? ""} — ${messageRow.message.trim()}`
    : `${messageRow.mood_emoji ?? ""} ${messageRow.mood_label ?? ""}`.trim()

  const payload = JSON.stringify({
    title: "Nuova richiesta ricevuta",
    body,
    url: "/admin",
    tag: "deea-new-request",
  })

  const results = await Promise.allSettled(rows.map((r) => webPush.sendNotification(r.subscription, payload)))
  const stale = []
  for (let i = 0; i < results.length; i++) {
    const r = results[i]
    if (r.status === "rejected") {
      const statusCode = r.reason?.statusCode
      if (statusCode === 404 || statusCode === 410) stale.push(rows[i].endpoint)
    }
  }
  if (stale.length) {
    await pool.query(`DELETE FROM deea_push_subscriptions WHERE endpoint = ANY($1::text[])`, [stale])
  }
}

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
  try {
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
      const created = insert.rows[0]
      try {
        await notifyAdmins(pool, created)
      } catch {}
      return sendJson(res, 201, { message: created })
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
