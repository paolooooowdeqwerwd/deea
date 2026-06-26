import React, { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { base44 } from "@/api/base44Client"
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
  const [selectedMood, setSelectedMood] = useState(null)
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login")
  }, [])

  async function handleSend() {
    if (!selectedMood && !message.trim()) return
    setSending(true)
    try {
      await base44.entities.MoodMessage.create({
        mood_emoji: selectedMood ? selectedMood.emoji : "💬",
        mood_label: selectedMood ? selectedMood.label : "Messaggio",
        message: message.trim(),
        sent_at: new Date().toISOString(),
      })
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setSelectedMood(null)
        setMessage("")
      }, 3000)
    } catch (e) {}
    setSending(false)
  }

  return (
    <div className="flex flex-col items-center px-6 pb-12">
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">🌸</div>
        <h1 className="font-display text-3xl font-bold text-pink-600 italic">Come ti senti oggi?</h1>
        <p className="font-body text-pink-400 text-sm mt-2">Dimmi tutto, sono qui per te 💕</p>
      </div>

      {sent ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <div className="text-6xl pulse-heart">💗</div>
          <h2 className="font-display text-2xl font-bold text-pink-600 italic">Messaggio inviato!</h2>
          <p className="font-body text-pink-400 text-sm text-center max-w-xs">
            Il tuo amore l'ha ricevuto 🌹 Ti voglio un mondo di bene!
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
                  onClick={() => setSelectedMood(selectedMood?.label === mood.label ? null : mood)}
                  className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl border-2 transition-all duration-200 ${
                    selectedMood?.label === mood.label
                      ? `bg-gradient-to-br ${mood.color} border-transparent shadow-lg scale-105 text-white`
                      : "bg-white/60 border-pink-100 hover:border-pink-300 hover:bg-pink-50"
                  }`}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span
                    className={`font-body text-xs font-medium leading-tight text-center ${
                      selectedMood?.label === mood.label ? "text-white" : "text-pink-600"
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
            disabled={sending || (!selectedMood && !message.trim())}
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
        </div>
      )}
    </div>
  )
}
