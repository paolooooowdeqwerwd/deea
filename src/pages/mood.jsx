import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cloudGetPushPublicKey, cloudListMessages, cloudSendUserMessage, cloudSubscribeUserPush, cloudUnsubscribeUserPush } from "@/api/cloudClient"
import { isLoggedIn } from "@/lib/auth"
import { Heart, Send } from "lucide-react"

const MOODS = [
  { label: "Vogliosa", emoji: "🔥", color: "from-orange-400 to-red-400" },
  { label: "Arrabbiata", emoji: "😠", color: "from-red-500 to-rose-600" },
  { label: "Triste", emoji: "😢", color: "from-blue-400 to-indigo-500" },
  { label: "Affamata", emoji: "🍕", color: "from-yellow-400 to-orange-400" },
  { label: "Incazzata", emoji: "😤", color: "from-red-600 to-pink-700" },
  { label: "Amorevole", emoji: "🥰", color: "from-pink-400 to-rose-400" },
  { label: "Felice", emoji: "😊", color: "from-green-400 to-teal-500" },
  { label: "Felicissima", emoji: "🤩", color: "from-yellow-400 to-pink-400" },
  { label: "Normale", emoji: "😐", color: "from-gray-400 to-slate-500" },
]

export default function Mood() {
  const navigate = useNavigate()
  const [selectedMoods, setSelectedMoods] = useState([])
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [syncError, setSyncError] = useState(null)
  const [adminMessages, setAdminMessages] = useState([])
  const [loadingAdminMessages, setLoadingAdminMessages] = useState(true)
  const [pushSupported, setPushSupported] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login")
  }, [])

  useEffect(() => {
    const supported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window
    setPushSupported(supported)
    if (!supported) return
    if (!isLoggedIn()) return
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushEnabled(Boolean(sub)))
      .catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false

    async function refresh({ showLoading }) {
      if (showLoading) setLoadingAdminMessages(true)
      try {
        const data = await cloudListMessages({ order: "asc" })
        if (cancelled) return
        const onlyAdmin = (data?.messages || []).filter((m) => m.direction === "admin")
        setAdminMessages(onlyAdmin)
        setSyncError(null)
      } catch (e) {
        if (cancelled) return
        setSyncError(e?.message || "Non riesco a collegarmi al server.")
      }
      if (!cancelled && showLoading) setLoadingAdminMessages(false)
    }

    refresh({ showLoading: true })
    const interval = window.setInterval(() => refresh({ showLoading: false }), 2000)

    function onFocus() {
      refresh({ showLoading: false })
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)

    return () => {
      cancelled = true
      window.clearInterval(interval)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [])

  async function handleSend() {
    if (selectedMoods.length === 0 && !message.trim()) return
    setSending(true)
    const sentAt = new Date().toISOString()
    const moodEmoji = selectedMoods.length ? selectedMoods.map((m) => m.emoji).join(" ").slice(0, 16) : "💬"
    const moodLabel = selectedMoods.length ? selectedMoods.map((m) => m.label).join(", ").slice(0, 64) : "Messaggio"
    const trimmedMessage = message.trim()
    try {
      await cloudSendUserMessage({
        mood_label: moodLabel,
        mood_emoji: moodEmoji,
        message: trimmedMessage,
        sent_at: sentAt,
      })
      setSyncError(null)
      window.alert("Hai inviato tutto con successo.")
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setSelectedMoods([])
        setMessage("")
      }, 3000)
    } catch (e) {
      setSyncError(e?.message || "Non sono riuscito a inviare. Riprova.")
      window.alert(e?.message || "Non sono riuscito a inviare. Riprova.")
    }
    setSending(false)
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
      await cloudSubscribeUserPush({ subscription: sub })
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
        await cloudUnsubscribeUserPush({ endpoint: sub.endpoint })
        await sub.unsubscribe()
      }
      setPushEnabled(false)
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a disattivare le notifiche.")
    }
    setPushBusy(false)
  }


  return (
    <div className="flex flex-col items-center px-6 pb-12">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🌸</div>
        <h1 className="font-display text-3xl font-bold text-pink-600 italic">Come ti senti oggi?</h1>
        <p className="font-body text-pink-400 text-sm mt-2">Dimmi tutto, sono qui per te 💕</p>
      </div>

      <div className="w-full max-w-sm mb-6">
        {syncError ? (
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-pink-100 p-4">
            <p className="font-body text-pink-700 text-sm font-semibold">Sincronizzazione</p>
            <p className="font-body text-rose-500 text-xs">{syncError}</p>
          </div>
        ) : null}
      </div>

      <div className="w-full max-w-sm mb-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow border border-pink-100 p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-body text-pink-700 text-sm font-semibold">Notifiche</p>
            {!pushSupported ? (
              <p className="font-body text-pink-400 text-xs">Non supportate qui.</p>
            ) : pushEnabled ? (
              <p className="font-body text-pink-400 text-xs">Attive: ti avviso quando lui ti risponde.</p>
            ) : (
              <p className="font-body text-pink-400 text-xs">Attivale per ricevere avvisi quando lui ti risponde.</p>
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
      </div>

      {sent ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="text-6xl pulse-heart">💗</div>
          <h2 className="font-display text-2xl font-bold text-pink-600 italic">Messaggio inviato!</h2>
          <p className="font-body text-pink-400 text-sm text-center max-w-xs">
            Il tuo amore l'ha ricevuto 🌹 Ti amo da morire piccola mia ❤️
          </p>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col gap-5">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-5">
            <p className="font-body text-pink-600 text-sm font-semibold text-center mb-4">
              Oggi mi sento:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {MOODS.map((mood) => (
                <button
                  key={mood.label}
                  onClick={() =>
                    setSelectedMoods((prev) => {
                      const exists = prev.some((m) => m.label === mood.label)
                      return exists ? prev.filter((m) => m.label !== mood.label) : [...prev, mood]
                    })
                  }
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all duration-200 ${
                    selectedMoods.some((m) => m.label === mood.label)
                      ? `bg-gradient-to-br ${mood.color} border-transparent shadow-lg scale-105 text-white`
                      : "bg-white/60 border-pink-100 hover:border-pink-300 hover:bg-pink-50"
                  }`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span
                    className={`font-body text-xs font-medium leading-tight text-center ${
                      selectedMoods.some((m) => m.label === mood.label) ? "text-white" : "text-pink-600"
                    }`}
                  >
                    {mood.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-5">
            <p className="font-body text-pink-600 text-sm font-semibold mb-3">
              Vuoi aggiungere qualcosa? ✍️
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Scrivimi tutto quello che vuoi, amore mio..."
              rows={5}
              className="w-full px-4 py-3 rounded-2xl border border-pink-200 bg-pink-50/50 text-pink-800 placeholder-pink-300 font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all resize-none leading-relaxed"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={sending || (selectedMoods.length === 0 && !message.trim())}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Heart size={18} className="fill-white" />
                Invia al mio amore
                <Send size={16} />
              </>
            )}
          </button>

          <p className="font-display italic text-pink-300 text-xs text-center">
            "Non c'è nulla che non possiamo affrontare insieme" 🌸
          </p>

          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-pink-100">
              <h2 className="font-body font-semibold text-pink-700 text-sm">Messaggi dal pannello admin</h2>
              <p className="font-body text-pink-400 text-xs">Qui trovi tutto quello che ti scrivo io dall’admin.</p>
            </div>

            {loadingAdminMessages ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-7 h-7 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
              </div>
            ) : adminMessages.length === 0 ? (
              <div className="px-5 py-6">
                <p className="font-body text-pink-300 text-sm text-center">Ancora nessun messaggio 💌</p>
              </div>
            ) : (
              <div className="divide-y divide-pink-50">
                {adminMessages
                  .slice()
                  .reverse()
                  .map((m) => (
                    <div key={m.id} className="px-5 py-4">
                      <div className="flex items-start gap-3">
                        <span className="text-xl mt-0.5">💌</span>
                        <p className="font-body text-pink-700 text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
