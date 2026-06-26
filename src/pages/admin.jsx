import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
import { appParams } from "@/lib/app-params"
import { adminLogout, isAdminLoggedIn } from "@/lib/auth"
import { Heart, LogOut, MessageSquare, RefreshCw, Shield, Trash2 } from "lucide-react"
import { format, parseISO } from "date-fns"
import { it } from "date-fns/locale"

const LOCAL_MOOD_MESSAGES_KEY = "deea_mood_messages"

function getLocalMoodMessages() {
  try {
    const raw = localStorage.getItem(LOCAL_MOOD_MESSAGES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function setLocalMoodMessages(records) {
  localStorage.setItem(LOCAL_MOOD_MESSAGES_KEY, JSON.stringify(records))
}

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
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate("/admin-login")
      return
    }
    loadMessages()
  }, [])

  async function loadMessages() {
    setLoading(true)
    if (!appParams.appId) {
      setMessages(getLocalMoodMessages())
      setLoading(false)
      return
    }
    try {
      const data = await base44.entities.MoodMessage.list("-sent_at")
      setMessages(data || [])
    } catch (e) {
      setMessages(getLocalMoodMessages())
    }
    setLoading(false)
  }

  async function deleteMessage(id) {
    setDeleting(id)
    if (!appParams.appId) {
      const next = getLocalMoodMessages().filter((m) => m.id !== id)
      setLocalMoodMessages(next)
      setMessages(next)
      setDeleting(null)
      return
    }
    try {
      await base44.entities.MoodMessage.delete(id)
      setMessages((prev) => prev.filter((m) => m.id !== id))
    } catch (e) {
      const next = getLocalMoodMessages().filter((m) => m.id !== id)
      setLocalMoodMessages(next)
      setMessages(next)
    }
    setDeleting(null)
  }

  function handleLogout() {
    adminLogout()
    navigate("/admin-login")
  }

  function formatDate(dateStr) {
    try {
      return format(parseISO(dateStr), "d MMMM yyyy 'alle' HH:mm", { locale: it })
    } catch {
      return dateStr
    }
  }

  const latestMood = messages.find((m) => m.mood_label && m.mood_label !== "Messaggio")

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
            onClick={loadMessages}
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
              {messages.length === 0 ? "Nessun messaggio ancora" : `${messages.length} messaggi`}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Heart size={32} className="text-pink-200" />
              <p className="font-display italic text-pink-300 text-sm">
                Andreea non ha ancora scritto nulla...
              </p>
            </div>
          ) : (
            <div className="divide-y divide-pink-50">
              {messages.map((msg) => (
                <div key={msg.id} className="px-5 py-4 hover:bg-pink-50/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
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
                            {formatDate(msg.sent_at || msg.created_date)}
                          </span>
                        </div>
                        {msg.message && (
                          <p className="font-body text-pink-700 text-sm leading-relaxed">
                            {msg.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      disabled={deleting === msg.id}
                      className="flex-shrink-0 p-1.5 rounded-lg text-rose-300 hover:text-rose-500 hover:bg-rose-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      type="button"
                    >
                      {deleting === msg.id ? (
                        <div className="w-4 h-4 border-2 border-rose-300 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
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
