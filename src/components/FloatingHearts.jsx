import React from "react"

const hearts = [
  { cls: "float-1", top: "10%", left: "5%", size: "text-2xl", opacity: "opacity-30" },
  { cls: "float-2", top: "20%", right: "8%", size: "text-xl", opacity: "opacity-20" },
  { cls: "float-3", top: "60%", left: "3%", size: "text-3xl", opacity: "opacity-20" },
  { cls: "float-4", top: "75%", right: "5%", size: "text-2xl", opacity: "opacity-25" },
  { cls: "float-5", top: "40%", left: "88%", size: "text-lg", opacity: "opacity-15" },
  { cls: "float-1", top: "85%", left: "15%", size: "text-xl", opacity: "opacity-20" },
  { cls: "float-3", top: "5%", left: "50%", size: "text-lg", opacity: "opacity-15" },
]

export default function FloatingHearts() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {hearts.map((h, i) => (
        <div
          key={i}
          className={`absolute ${h.cls} ${h.size} ${h.opacity}`}
          style={{ top: h.top, left: h.left, right: h.right }}
        >
          🌸
        </div>
      ))}
    </div>
  )
}
