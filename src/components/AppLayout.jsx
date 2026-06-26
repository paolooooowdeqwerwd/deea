import React from "react"
import { Outlet } from "react-router-dom"
import HamburgerMenu from "./HamburgerMenu"
import FloatingHearts from "./FloatingHearts"

export default function AppLayout() {
  return (
    <div
      className="min-h-screen relative"
      style={{ background: "linear-gradient(135deg, #fff0f5 0%, #fff5f8 40%, #fce8f0 70%, #fdf0f8 100%)" }}
    >
      <FloatingHearts />
      <div className="fixed top-0 left-0 right-0 z-40 px-4 pt-4 pb-2 flex items-center justify-between">
        <HamburgerMenu />
        <div className="flex items-center gap-1 text-pink-400 font-display text-lg font-semibold italic">
          Deea <span className="text-xl">💗</span>
        </div>
      </div>
      <div className="relative z-10 pt-20 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
