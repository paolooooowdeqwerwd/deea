import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import { login } from "@/lib/auth"
import { Eye, EyeOff, Heart, Lock, User } from "lucide-react"

export default function Login() {
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError("")
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    const ok = login(name, password)
    setLoading(false)
    if (ok) {
      navigate("/")
    } else {
      setError("Nome o password non corretti. Solo tu puoi entrare qui, amore mio 💕")
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-6">
      <div className="text-center mb-8">
        <div className="text-5xl mb-3 pulse-heart inline-block">💗</div>
        <h1 className="font-display text-3xl font-bold text-pink-600 italic">Benvenuta, amore</h1>
        <p className="font-body text-pink-400 text-sm mt-2">Questa app è solo per te 🌸</p>
      </div>

      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-pink-100 p-8 w-full max-w-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block font-body text-xs font-semibold text-pink-500 mb-2 uppercase tracking-wider">
              Il tuo nome completo
            </label>
            <div className="relative">
              <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Andreea Raluca Tomoiaga"
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-pink-200 bg-pink-50/50 text-pink-800 placeholder-pink-300 font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block font-body text-xs font-semibold text-pink-500 mb-2 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-300" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••"
                className="w-full pl-9 pr-10 py-3 rounded-xl border border-pink-200 bg-pink-50/50 text-pink-800 placeholder-pink-300 font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-pink-300 hover:text-pink-500 transition-colors"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-rose-500 text-sm font-body text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !name || !password}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body font-semibold py-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 mt-1"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Heart size={18} className="fill-white" />
                Entra nel nostro spazio
              </>
            )}
          </button>
        </form>
      </div>

      <p className="font-display italic text-pink-300 text-sm mt-8 text-center max-w-xs">
        "Ti amo ogni giorno un po' di più" 💕
      </p>
    </div>
  )
}
