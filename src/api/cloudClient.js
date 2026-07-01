const USER_TOKEN_KEY = "deea_user_token"
const ADMIN_TOKEN_KEY = "deea_admin_token"

export const tokenStorage = {
  getUserToken() {
    try {
      return localStorage.getItem(USER_TOKEN_KEY)
    } catch {
      return null
    }
  },
  setUserToken(token) {
    try {
      localStorage.setItem(USER_TOKEN_KEY, token)
    } catch {}
  },
  clearUserToken() {
    localStorage.removeItem(USER_TOKEN_KEY)
  },
  getAdminToken() {
    try {
      return localStorage.getItem(ADMIN_TOKEN_KEY)
    } catch {
      return null
    }
  },
  setAdminToken(token) {
    try {
      localStorage.setItem(ADMIN_TOKEN_KEY, token)
    } catch {}
  },
  clearAdminToken() {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  },
}

async function apiFetch(path, { method = "GET", body, token } = {}) {
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await res.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = { error: text || "Risposta non valida dal server" }
  }

  if (!res.ok) {
    const message = data?.error || `Errore server (${res.status})`
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  return data
}

export async function cloudLogin({ name, password }) {
  return apiFetch("/api/auth/login", { method: "POST", body: { name, password } })
}

export async function cloudAdminLogin({ password }) {
  return apiFetch("/api/auth/admin-login", { method: "POST", body: { password } })
}

export async function cloudListMessages({ order = "desc", since, admin = false } = {}) {
  const token = admin ? tokenStorage.getAdminToken() : tokenStorage.getUserToken()
  const params = new URLSearchParams()
  if (order) params.set("order", order)
  if (since) params.set("since", since)
  const qs = params.toString() ? `?${params.toString()}` : ""
  return apiFetch(`/api/messages${qs}`, { token })
}

export async function cloudSendUserMessage({ mood_label, mood_emoji, message, sent_at }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/messages", {
    method: "POST",
    token,
    body: { mood_label, mood_emoji, message, sent_at },
  })
}

export async function cloudSendAdminReply({ message }) {
  const token = tokenStorage.getAdminToken()
  return apiFetch("/api/admin/reply", { method: "POST", token, body: { message } })
}

export async function cloudDeleteAdminMessage({ id }) {
  const token = tokenStorage.getAdminToken()
  return apiFetch("/api/admin/reply", { method: "DELETE", token, body: { id } })
}

export async function cloudGetRelationshipDate() {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/relationship-date", { token })
}

export async function cloudSetRelationshipDate({ start_date }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/relationship-date", { method: "PUT", token, body: { start_date } })
}

export async function cloudClearRelationshipDate() {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/relationship-date", { method: "DELETE", token })
}

export async function cloudGetPushPublicKey() {
  return apiFetch("/api/push")
}

export async function cloudSubscribeAdminPush({ subscription }) {
  const token = tokenStorage.getAdminToken()
  return apiFetch("/api/push", { method: "POST", token, body: { action: "subscribe", subscription } })
}

export async function cloudUnsubscribeAdminPush({ endpoint }) {
  const token = tokenStorage.getAdminToken()
  return apiFetch("/api/push", { method: "POST", token, body: { action: "unsubscribe", endpoint } })
}

export async function cloudSubscribeUserPush({ subscription }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/push", { method: "POST", token, body: { action: "subscribe", subscription } })
}

export async function cloudUnsubscribeUserPush({ endpoint }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/push", { method: "POST", token, body: { action: "unsubscribe", endpoint } })
}

export async function cloudGetCalendarMonth({ month }) {
  const token = tokenStorage.getUserToken()
  const qs = month ? `?month=${encodeURIComponent(month)}` : ""
  return apiFetch(`/api/calendar${qs}`, { token })
}

export async function cloudIncrementCalendar({ date, type }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/calendar", { method: "POST", token, body: { date, type, action: "inc" } })
}

export async function cloudDecrementCalendar({ date, type }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/calendar", { method: "POST", token, body: { date, type, action: "dec" } })
}

export async function cloudClearCalendarDay({ date }) {
  const token = tokenStorage.getUserToken()
  return apiFetch("/api/calendar", { method: "POST", token, body: { date, action: "clearDay" } })
}
