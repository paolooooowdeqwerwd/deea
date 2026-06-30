import React, { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  cloudDeleteAdminMessage,
  cloudGetPushPublicKey,
  cloudListMessages,
  cloudSendAdminReply,
  cloudSubscribeAdminPush,
  cloudUnsubscribeAdminPush,
} from "@/api/cloudClient"
import { adminLogout, isAdminLoggedIn } from "@/lib/auth"
import { Heart, LogOut, MessageSquare, RefreshCw, Shield, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { it } from "date-fns/locale"

const MOOD_COLORS = {
  Vogliosa: "bg-orange-100 text-orange-700 border-orange-200",
  Arrabbiata: "bg-red-100 text-red-700 border-red-200",
  Triste: "bg-blue-100 text-blue-700 border-blue-200",
  Affamata: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Incazzata: "bg-red-200 text-red-800 border-red-300",
  Amorevole: "bg-pink-100 text-pink-700 border-pink-200",
  Felice: "bg-green-100 text-green-700 border-green-200",
  Felicissima: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Normale: "bg-gray-100 text-gray-600 border-gray-200",
  Messaggio: "bg-purple-100 text-purple-700 border-purple-200",
}

export default function Admin() {
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncError, setSyncError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [replyText, setReplyText] = useState("")
  const [sendingReply, setSendingReply] = useState(false)
  const [deletingAdminMessageId, setDeletingAdminMessageId] = useState(null)
  const [notificationPermission, setNotificationPermission] = useState(() =>
    typeof Notification === "undefined" ? "unsupported" : Notification.permission
  )
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const lastSeenUserMessageIdRef = useRef(null)

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin-login")
      return
    }
    refreshMessages({ showLoading: true, notify: false })
  }, [])

  useEffect(() => {
    if (!isAdminLoggedIn()) return
    const interval = window.setInterval(() => {
      refreshMessages({ showLoading: false, notify: true })
    }, 2000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    function onVisibilityOrFocus() {
      setNotificationPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission)
      if (isAdminLoggedIn()) refreshMessages({ showLoading: false, notify: false })
    }
    document.addEventListener("visibilitychange", onVisibilityOrFocus)
    window.addEventListener("focus", onVisibilityOrFocus)
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityOrFocus)
      window.removeEventListener("focus", onVisibilityOrFocus)
    }
  }, [])

  useEffect(() => {
    const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
    setPushSupported(supported)
    if (!supported) return
    if (!isAdminLoggedIn()) return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(Boolean(sub)))
      .catch(() => {})
  }, [])

  async function refreshMessages({ showLoading, notify }) {
    if (showLoading) setLoading(true)
    try {
      const data = await cloudListMessages({ admin: true, order: "desc" })
      const next = data?.messages || []
      setSyncError(null)
      setLastUpdatedAt(new Date().toISOString())
      setMessages(next)

      if (notify) {
        const latestUser = next.find((m) => m.direction === "user")
        if (latestUser?.id) {
          const prevLastSeen = lastSeenUserMessageIdRef.current
          if (prevLastSeen && prevLastSeen !== latestUser.id) {
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              const title = "Nuova richiesta ricevuta"
              const body = latestUser.message?.trim()
                ? `${latestUser.mood_emoji ?? ""} ${latestUser.mood_label ?? ""} — ${latestUser.message.trim()}`
                : `${latestUser.mood_emoji ?? ""} ${latestUser.mood_label ?? ""}`.trim()
              const n = new Notification(title, { body })
              n.onclick = () => {
                window.focus()
              }
            }
          }
          lastSeenUserMessageIdRef.current = latestUser.id
        }
      } else {
        const latestUser = next.find((m) => m.direction === "user")
        if (latestUser?.id) lastSeenUserMessageIdRef.current = latestUser.id
      }
    } catch (e) {
      setSyncError(e?.message || "Connessione non disponibile: non riesco a sincronizzare in tempo reale.")
      if (showLoading) setLoading(false)
      return
    }
    if (showLoading) setLoading(false)
  }

  async function handleSendReply() {
    const text = replyText.trim()
    if (!text) return
    setSendingReply(true)
    try {
      await cloudSendAdminReply({ message: text })
      setReplyText("")
      await refreshMessages({ showLoading: false, notify: false })
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a inviare la risposta. Riprova.")
    }
    setSendingReply(false)
  }

  function handleLogout() {
    adminLogout()
    navigate("/admin-login")
  }

  async function requestNotifications() {
    if (typeof Notification === "undefined") {
      setNotificationPermission("unsupported")
      return
    }
    const result = await Notification.requestPermission()
    setNotificationPermission(result)
  }

  function base64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
    return outputArray
  }

  async function enablePush() {
    if (!pushSupported) return
    setPushBusy(true)
    try {
      if (typeof Notification === "undefined") return
      if (Notification.permission !== "granted") {
        const perm = await Notification.requestPermission()
        setNotificationPermission(perm)
        if (perm !== "granted") return
      }
      const data = await cloudGetPushPublicKey()
      const publicKey = data?.publicKey ? String(data.publicKey) : ""
      if (!publicKey) throw new Error("Chiave notifiche mancante sul server.")
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(publicKey),
      })
      await cloudSubscribeAdminPush({ subscription: sub })
      setPushEnabled(true)
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito ad attivare le notifiche.")
    }
    setPushBusy(false)
  }

  async function disablePush() {
    if (!pushSupported) return
    setPushBusy(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub?.endpoint) {
        await cloudUnsubscribeAdminPush({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setPushEnabled(false)
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a disattivare le notifiche.")
    }
    setPushBusy(false)
  }

  async function handleDeleteAdminMessage(id) {
    if (!id) return
    const ok = window.confirm("Vuoi eliminare questo messaggio? Verrà rimosso anche dalla sua app.")
    if (!ok) return
    setDeletingAdminMessageId(id)
    try {
      await cloudDeleteAdminMessage({ id })
      await refreshMessages({ showLoading: false, notify: false })
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a eliminare il messaggio.")
    }
    setDeletingAdminMessageId(null)
  }

  function formatDate(dateStr) {
    try {
      return format(parseISO(dateStr), "d MMMM yyyy 'alle' HH:mm", { locale: it })
    } catch {
      return dateStr
    }
  }

  const latestMood = messages.find((m) => m.direction === "user" && m.mood_label && m.mood_label !== "Messaggio")
  const userMessages = messages.filter((m) => m.direction === "user")
  const adminMessages = messages.filter((m) => m.direction === "admin")

  return (
    <div className="flex flex-col items-center px-4 pb-12">
      <div className="w-full max-w-2xl flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-md">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-pink-700">Pannello Admin</h1>
            <p className="font-body text-pink-400 text-xs">Messaggi di Andreea</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refreshMessages({ showLoading: true, notify: false })}
            className="p-2 rounded-xl bg-white/80 border border-pink-100 text-pink-500 hover:bg-pink-50 transition-all shadow-sm"
            type="button"
          >
            <RefreshCw size={16} />
          </button>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-white/80 border border-pink-100 text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
            type="button"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <div className="w-full max-w-2xl flex flex-col gap-4">
        {syncError && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-pink-100 p-4">
            <p className="font-body text-pink-700 text-sm font-semibold">Sincronizzazione</p>
            <p className="font-body text-rose-500 text-xs">{syncError}</p>
          </div>
        )}
        {!syncError && (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-pink-100 p-4">
            <p className="font-body text-pink-700 text-sm font-semibold">Sincronizzazione</p>
            <p className="font-body text-pink-400 text-xs">
              Attiva: mostro le richieste da tutti i dispositivi.{" "}
              {lastUpdatedAt ? `Ultimo aggiornamento: ${formatDate(lastUpdatedAt)}.` : ""}
            </p>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-5">
          <p className="font-body text-pink-700 text-sm font-semibold mb-2">Rispondi</p>
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={3}
            placeholder="Scrivi un messaggio che comparirà nella sua app..."
            className="w-full px-4 py-3 rounded-2xl border border-pink-200 bg-pink-50/50 text-pink-800 placeholder-pink-300 font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all resize-none leading-relaxed"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyText.trim()}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body text-xs font-semibold shadow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
            >
              {sendingReply ? "Invio..." : "Invia"}
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-pink-100 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-pink-700 text-sm font-semibold">Notifiche</p>
            {notificationPermission === "granted" ? (
              <p className="font-body text-pink-400 text-xs">Attive: ti avviso quando arriva una nuova richiesta.</p>
            ) : notificationPermission === "denied" ? (
              <p className="font-body text-pink-400 text-xs">
                Bloccate dal browser: abilita le notifiche dalle impostazioni del browser e ricarica la pagina.
              </p>
            ) : notificationPermission === "unsupported" ? (
              <p className="font-body text-pink-400 text-xs">
                Non supportate qui. Su iPhone funzionano solo se aggiungi l’app alla Home e la apri da lì.
              </p>
            ) : (
              <p className="font-body text-pink-400 text-xs">
                Abilita le notifiche per sapere quando arriva una nuova richiesta.
              </p>
            )}
          </div>
          {notificationPermission === "default" && (
            <button
              onClick={requestNotifications}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body text-xs font-semibold shadow hover:scale-[1.02] active:scale-[0.98] transition-all"
              type="button"
            >
              Abilita
            </button>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-pink-100 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-pink-700 text-sm font-semibold">Notifiche push (anche da chiusa)</p>
            {!pushSupported ? (
              <p className="font-body text-pink-400 text-xs">Non supportate qui.</p>
            ) : pushEnabled ? (
              <p className="font-body text-pink-400 text-xs">Attive: ti avviso anche quando l’app è chiusa.</p>
            ) : (
              <p className="font-body text-pink-400 text-xs">Attivale per ricevere avvisi anche quando l’app è chiusa.</p>
            )}
          </div>
          {pushSupported && (
            <button
              onClick={pushEnabled ? disablePush : enablePush}
              disabled={pushBusy}
              className="flex-shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body text-xs font-semibold shadow hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
            >
              {pushEnabled ? "Disattiva" : "Attiva"}
            </button>
          )}
        </div>
        {latestMood && (
          <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-3xl shadow-xl p-5 text-white">
            <p className="font-body text-pink-100 text-xs mb-1 uppercase tracking-wider">
              Ultimo umore registrato
            </p>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{latestMood.mood_emoji}</span>
              <div>
                <p className="font-display text-2xl font-bold">{latestMood.mood_label}</p>
                <p className="font-body text-pink-200 text-xs">{formatDate(latestMood.sent_at)}</p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-pink-100 flex items-center gap-2">
            <MessageSquare size={16} className="text-pink-500" />
            <h2 className="font-body font-semibold text-pink-700 text-sm">
              {userMessages.length === 0 ? "Nessuna richiesta ancora" : `${userMessages.length} richieste`}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : userMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Heart size={32} className="text-pink-200" />
              <p className="font-display italic text-pink-300 text-sm">
                Andreea non ha ancora scritto nulla...
              </p>
            </div>
          ) : (
            <div className="divide-y divide-pink-50">
              {userMessages.map((msg) => (
                <div key={msg.id} className="px-5 py-4 hover:bg-pink-50/30 transition-colors">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-2xl flex-shrink-0 mt-0.5">{msg.mood_emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span
                          className={`font-body text-xs font-semibold px-2 py-0.5 rounded-full border ${
                            MOOD_COLORS[msg.mood_label] || "bg-pink-100 text-pink-700 border-pink-200"
                          }`}
                        >
                          {msg.mood_label}
                        </span>
                        <span className="font-body text-pink-300 text-xs">
                          {formatDate(msg.sent_at)}
                        </span>
                      </div>
                      {msg.message && (
                        <p className="font-body text-pink-700 text-sm leading-relaxed whitespace-pre-wrap">
                          {msg.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-pink-100">
            <h2 className="font-body font-semibold text-pink-700 text-sm">
              {adminMessages.length === 0 ? "Nessuna risposta inviata" : `${adminMessages.length} risposte inviate`}
            </h2>
          </div>
          {adminMessages.length === 0 ? (
            <div className="px-5 py-6">
              <p className="font-body text-pink-300 text-sm text-center">Quando invii una risposta, comparirà qui e nella sua app.</p>
            </div>
          ) : (
            <div className="divide-y divide-pink-50">
              {adminMessages.map((m) => (
                <div key={m.id} className="px-5 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-body text-pink-700 text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                      <p className="font-body text-pink-300 text-xs mt-1">{formatDate(m.sent_at)}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteAdminMessage(m.id)}
                      disabled={deletingAdminMessageId === m.id}
                      className="flex-shrink-0 p-2 rounded-xl bg-white/80 border border-pink-100 text-rose-500 hover:bg-rose-50 transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                      title="Elimina"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-100 p-5">
          <p className="font-body text-pink-500 text-xs text-center leading-relaxed">
            Widget iPhone: installa l'app e aggiungi il widget dalla schermata Home tenendo premuto.
          </p>
        </div>
      </div>
    </div>
  )
}
