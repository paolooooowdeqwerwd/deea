import React from "react"
import { MessageCircleHeart } from "lucide-react"

export default function Home() {
  function openWhatsApp() {
    const phone = "393921143643"
    const message = encodeURIComponent("Ciao amore mio bellissimo della mia vita, oggi mi sento un po' ")
    const url = `https://wa.me/${phone}?text=${message}`
    window.open(url, "_blank")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <div className="mb-8 flex gap-3 text-4xl">
        <span className="pulse-heart inline-block">💗</span>
        <span className="pulse-heart inline-block" style={{ animationDelay: "0.3s" }}>🌸</span>
        <span className="pulse-heart inline-block" style={{ animationDelay: "0.6s" }}>💗</span>
      </div>

      <h1
        className="font-display text-4xl md:text-5xl font-bold text-pink-600 leading-tight mb-4"
        style={{ textShadow: "0 2px 20px rgba(236,72,153,0.15)" }}
      >
        Come stai,<br />
        <span className="italic text-rose-500">Andreea?</span>
      </h1>

      <p className="font-body text-lg md:text-xl text-pink-400 mb-10 max-w-xs leading-relaxed font-light">
        Stai male, sei arrabbiata,<br />stanca, triste?
      </p>

      <div className="bg-white/70 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-8 max-w-sm w-full mb-8">
        <p className="font-body text-pink-500 text-sm mb-6 leading-relaxed">
          Qualsiasi cosa tu senta, io sono qui per te. 🌹<br />
          Scrivimi e dimmi tutto.
        </p>

        <button
          onClick={openWhatsApp}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body font-semibold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 text-base"
        >
          <MessageCircleHeart size={20} />
          Contattami e dimmi cosa hai
        </button>
      </div>

      <p className="font-display italic text-pink-300 text-sm max-w-xs">
        "Sei la cosa più bella che mi sia mai capitata" 💕
      </p>

      <div className="mt-8 flex gap-2 text-2xl opacity-40">
        <span>♡</span><span>♡</span><span>♡</span>
      </div>
    </div>
  )
}
