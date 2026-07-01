import { readBody, sendError, sendJson, getBearerToken } from "../_util.js"
import { verifyToken } from "../_auth.js"
import { getPool, initDb } from "../_db.js"
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

async function notifyUsers(pool, messageRow) {
  if (!configureVapidIfPossible()) return
  const { rows } = await pool.query(
    `SELECT endpoint, subscription
     FROM deea_push_subscriptions
     WHERE role = 'user'`
  )
  if (!rows?.length) return

  const payload = JSON.stringify({
    title: "Nuovo messaggio 💌",
    body: messageRow?.message ? String(messageRow.message).slice(0, 140) : "",
    url: "/mood",
    tag: "deea-admin-reply",
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
      const created = insert.rows[0]
      try {
        await notifyUsers(pool, created)
      } catch {}
      return sendJson(res, 201, { message: created })
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
