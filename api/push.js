import { readBody, sendError, sendJson, getBearerToken } from "./_util.js"
import { verifyToken } from "./_auth.js"
import { getPool, initDb } from "./_db.js"

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

const getVapidPublicKey = () => {
  return process.env.VAPID_PUBLIC_KEY || process.env.WEB_PUSH_PUBLIC_KEY || ""
}

export default async function handler(req, res) {
  try {
    await initDb()
    const pool = getPool()

    if (req.method === "GET") {
      const publicKey = getVapidPublicKey()
      if (!publicKey) return sendError(res, 500, "VAPID public key mancante (VAPID_PUBLIC_KEY).")
      return sendJson(res, 200, { publicKey })
    }

    if (req.method === "POST") {
      const auth = requireAdmin(req, res)
      if (!auth) return

      const body = await readBody(req)
      if (!body || body.__invalid_json) return sendError(res, 400, "Invalid JSON body")

      const action = body.action ? String(body.action) : ""

      if (action === "subscribe") {
        const subscription = body.subscription
        const endpoint = subscription?.endpoint ? String(subscription.endpoint) : ""
        if (!endpoint) return sendError(res, 400, "Invalid subscription")

        await pool.query(
          `INSERT INTO deea_push_subscriptions (endpoint, role, subscription)
           VALUES ($1, 'admin', $2)
           ON CONFLICT (endpoint) DO UPDATE
           SET role = 'admin', subscription = $2, created_at = now()`,
          [endpoint, subscription]
        )
        return sendJson(res, 200, { ok: true })
      }

      if (action === "unsubscribe") {
        const endpoint = body.endpoint ? String(body.endpoint) : ""
        if (!endpoint) return sendError(res, 400, "Missing endpoint")
        await pool.query(`DELETE FROM deea_push_subscriptions WHERE endpoint = $1 AND role = 'admin'`, [endpoint])
        return sendJson(res, 200, { ok: true })
      }

      return sendError(res, 400, "Invalid action")
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
