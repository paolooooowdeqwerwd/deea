import React, { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { cloudClearCalendarDay, cloudDecrementCalendar, cloudGetCalendarMonth, cloudIncrementCalendar } from "@/api/cloudClient"
import { isLoggedIn } from "@/lib/auth"
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isSameMonth, startOfMonth, startOfWeek } from "date-fns"
import { it } from "date-fns/locale"

const padIso = (d) => format(d, "yyyy-MM-dd")
const monthKey = (d) => format(d, "yyyy-MM")

function buildMonthGrid(monthDate) {
  const start = startOfWeek(startOfMonth(monthDate), { locale: it })
  const end = endOfWeek(endOfMonth(monthDate), { locale: it })
  const days = []
  let cur = start
  while (cur <= end) {
    days.push(cur)
    cur = addDays(cur, 1)
  }
  return days
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [eventsByDate, setEventsByDate] = useState({})
  const [totals, setTotals] = useState({
    love_count: 0,
    prelim_him: 0,
    prelim_her: 0,
    came_him: 0,
    came_her: 0,
  })

  useEffect(() => {
    if (!isLoggedIn()) navigate("/login")
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const month = monthKey(currentMonth)
        const data = await cloudGetCalendarMonth({ month })
        if (cancelled) return
        const map = {}
        for (const e of data?.events || []) {
          if (e?.date) map[String(e.date)] = e
        }
        setEventsByDate(map)
        if (data?.totals) setTotals(data.totals)
      } catch (e) {
        if (!cancelled) window.alert(e?.message || "Non riesco a caricare il calendario.")
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [currentMonth])

  const gridDays = useMemo(() => buildMonthGrid(currentMonth), [currentMonth])
  const selectedIso = useMemo(() => padIso(selectedDate), [selectedDate])
  const selectedEvent = eventsByDate[selectedIso] || null

  function dayIcons(e) {
    if (!e) return []
    const icons = []
    if (Number(e.love_count || 0) > 0) icons.push({ type: "love", text: "❤️", count: 1 })
    const prelim = Number(e.prelim_him || 0) + Number(e.prelim_her || 0)
    if (prelim > 0) icons.push({ type: "prelim", text: "⚪️", count: 1 })
    const drops = Number(e.came_him || 0) + Number(e.came_her || 0)
    if (drops > 0) icons.push({ type: "came", text: "💧", count: drops })
    return icons
  }

  function renderIconStack(e) {
    const icons = dayIcons(e)
    if (!icons.length) return null
    return (
      <div className="absolute top-1 right-1 flex flex-col items-end gap-0.5">
        {icons.map((icon) => {
          if (icon.type === "came") {
            const n = Math.min(3, icon.count)
            const extra = icon.count > 3
            return (
              <div key={icon.type} className="text-[10px] leading-none">
                {Array.from({ length: n }).map((_, i) => (
                  <span key={i}>{icon.text}</span>
                ))}
                {extra ? <span className="ml-0.5">+</span> : null}
              </div>
            )
          }
          return (
            <div key={icon.type} className="text-[10px] leading-none">
              {icon.text}
            </div>
          )
        })}
      </div>
    )
  }

  async function increment(type) {
    setSaving(true)
    try {
      const date = selectedIso
      const res = await cloudIncrementCalendar({ date, type })
      const nextEvent = res?.event
      if (nextEvent?.date) {
        const sum =
          Number(nextEvent.love_count || 0) +
          Number(nextEvent.prelim_him || 0) +
          Number(nextEvent.prelim_her || 0) +
          Number(nextEvent.came_him || 0) +
          Number(nextEvent.came_her || 0)
        setEventsByDate((prev) => {
          const next = { ...prev }
          if (sum === 0) delete next[String(nextEvent.date)]
          else next[String(nextEvent.date)] = nextEvent
          return next
        })
      }
      setTotals((prev) => {
        const next = { ...prev }
        if (type === "love") next.love_count = Number(next.love_count || 0) + 1
        if (type === "prelim_him") next.prelim_him = Number(next.prelim_him || 0) + 1
        if (type === "prelim_her") next.prelim_her = Number(next.prelim_her || 0) + 1
        if (type === "came_him") next.came_him = Number(next.came_him || 0) + 1
        if (type === "came_her") next.came_her = Number(next.came_her || 0) + 1
        return next
      })
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a salvare.")
    }
    setSaving(false)
  }

  async function decrement(type) {
    const current = eventsByDate[selectedIso]
    if (!current) return
    const currentVal =
      type === "love"
        ? Number(current.love_count || 0)
        : type === "prelim_him"
          ? Number(current.prelim_him || 0)
          : type === "prelim_her"
            ? Number(current.prelim_her || 0)
            : type === "came_him"
              ? Number(current.came_him || 0)
              : Number(current.came_her || 0)
    if (currentVal <= 0) return

    setSaving(true)
    try {
      const date = selectedIso
      const res = await cloudDecrementCalendar({ date, type })
      const nextEvent = res?.event
      if (nextEvent?.date) {
        const sum =
          Number(nextEvent.love_count || 0) +
          Number(nextEvent.prelim_him || 0) +
          Number(nextEvent.prelim_her || 0) +
          Number(nextEvent.came_him || 0) +
          Number(nextEvent.came_her || 0)
        setEventsByDate((prev) => {
          const next = { ...prev }
          if (sum === 0) delete next[String(nextEvent.date)]
          else next[String(nextEvent.date)] = nextEvent
          return next
        })
      }
      setTotals((prev) => {
        const next = { ...prev }
        if (type === "love") next.love_count = Math.max(0, Number(next.love_count || 0) - 1)
        if (type === "prelim_him") next.prelim_him = Math.max(0, Number(next.prelim_him || 0) - 1)
        if (type === "prelim_her") next.prelim_her = Math.max(0, Number(next.prelim_her || 0) - 1)
        if (type === "came_him") next.came_him = Math.max(0, Number(next.came_him || 0) - 1)
        if (type === "came_her") next.came_her = Math.max(0, Number(next.came_her || 0) - 1)
        return next
      })
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a rimuovere.")
    }
    setSaving(false)
  }

  async function clearSelectedDay() {
    const current = eventsByDate[selectedIso]
    if (!current) return
    const ok = window.confirm("Vuoi rimuovere tutto da questo giorno?")
    if (!ok) return

    setSaving(true)
    try {
      await cloudClearCalendarDay({ date: selectedIso })
      setEventsByDate((prev) => {
        const next = { ...prev }
        delete next[selectedIso]
        return next
      })
      setTotals((prev) => ({
        love_count: Math.max(0, Number(prev.love_count || 0) - Number(current.love_count || 0)),
        prelim_him: Math.max(0, Number(prev.prelim_him || 0) - Number(current.prelim_him || 0)),
        prelim_her: Math.max(0, Number(prev.prelim_her || 0) - Number(current.prelim_her || 0)),
        came_him: Math.max(0, Number(prev.came_him || 0) - Number(current.came_him || 0)),
        came_her: Math.max(0, Number(prev.came_her || 0) - Number(current.came_her || 0)),
      }))
    } catch (e) {
      window.alert(e?.message || "Non sono riuscito a rimuovere.")
    }
    setSaving(false)
  }

  const weekdayLabels = useMemo(() => {
    const base = startOfWeek(new Date(), { locale: it })
    return Array.from({ length: 7 }).map((_, i) => format(addDays(base, i), "EEEEE", { locale: it }))
  }, [])

  return (
    <div className="flex flex-col items-center px-6 pb-12">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">😈</div>
        <h1 className="font-display text-3xl font-bold text-pink-600 italic">Calendario</h1>
        <p className="font-body text-pink-400 text-sm mt-2">Segniamo tutto quello che facciamo insieme.</p>
      </div>

      <div className="w-full max-w-sm flex flex-col gap-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-5">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                const next = startOfMonth(addDays(currentMonth, -1))
                setCurrentMonth(next)
                if (!isSameMonth(selectedDate, next)) setSelectedDate(next)
              }}
              className="px-3 py-2 rounded-xl bg-white/70 border border-pink-100 text-pink-600 font-body text-xs shadow-sm hover:bg-pink-50 transition-all"
            >
              ←
            </button>
            <p className="font-body text-pink-700 text-sm font-semibold">{format(currentMonth, "MMMM yyyy", { locale: it })}</p>
            <button
              type="button"
              onClick={() => {
                const next = startOfMonth(addDays(endOfMonth(currentMonth), 1))
                setCurrentMonth(next)
                if (!isSameMonth(selectedDate, next)) setSelectedDate(next)
              }}
              className="px-3 py-2 rounded-xl bg-white/70 border border-pink-100 text-pink-600 font-body text-xs shadow-sm hover:bg-pink-50 transition-all"
            >
              →
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center">
            <p className="font-body text-pink-400 text-xs">
              Giorno selezionato: <span className="font-semibold text-pink-600">{format(selectedDate, "d MMMM yyyy", { locale: it })}</span>
            </p>
          </div>

          <div className="mt-4 grid grid-cols-5 gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => increment("love")}
              className="col-span-5 px-4 py-3 rounded-2xl bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body text-xs font-semibold shadow hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              L’amore ❤️
            </button>

            <button
              type="button"
              disabled={saving || !selectedEvent}
              onClick={() => decrement("love")}
              className="col-span-5 px-4 py-2 rounded-2xl bg-white/80 border border-rose-200 text-rose-500 font-body text-xs font-semibold shadow-sm hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Rimuovi l’amore (−1)
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => increment("prelim_him")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-pink-100 text-pink-600 font-body text-[11px] font-semibold shadow-sm hover:bg-pink-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prelim. (lui)
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => increment("prelim_her")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-pink-100 text-pink-600 font-body text-[11px] font-semibold shadow-sm hover:bg-pink-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prelim. (lei)
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => increment("came_him")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-pink-100 text-pink-600 font-body text-[11px] font-semibold shadow-sm hover:bg-pink-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Venuto (lui)
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => increment("came_her")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-pink-100 text-pink-600 font-body text-[11px] font-semibold shadow-sm hover:bg-pink-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Venuta (lei)
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setSelectedDate(new Date())}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-pink-100 text-pink-600 font-body text-[11px] font-semibold shadow-sm hover:bg-pink-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Oggi
            </button>

            <button
              type="button"
              disabled={saving || !selectedEvent}
              onClick={() => decrement("prelim_him")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-500 font-body text-[11px] font-semibold shadow-sm hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prelim. (lui) −
            </button>
            <button
              type="button"
              disabled={saving || !selectedEvent}
              onClick={() => decrement("prelim_her")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-500 font-body text-[11px] font-semibold shadow-sm hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Prelim. (lei) −
            </button>
            <button
              type="button"
              disabled={saving || !selectedEvent}
              onClick={() => decrement("came_him")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-500 font-body text-[11px] font-semibold shadow-sm hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Venuto (lui) −
            </button>
            <button
              type="button"
              disabled={saving || !selectedEvent}
              onClick={() => decrement("came_her")}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-500 font-body text-[11px] font-semibold shadow-sm hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Venuta (lei) −
            </button>
            <button
              type="button"
              disabled={saving || !selectedEvent}
              onClick={clearSelectedDay}
              className="px-3 py-3 rounded-2xl bg-white/80 border border-rose-200 text-rose-500 font-body text-[11px] font-semibold shadow-sm hover:bg-rose-50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Pulisci
            </button>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-5">
          <p className="font-body text-pink-700 text-sm font-semibold mb-3">Contatori</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/70 border border-pink-100 rounded-2xl p-4">
              <p className="font-body text-pink-400 text-xs">L’amore</p>
              <p className="font-display text-3xl font-bold text-pink-600">{totals.love_count}</p>
            </div>
            <div className="bg-white/70 border border-pink-100 rounded-2xl p-4">
              <p className="font-body text-pink-400 text-xs">Preliminari (lui)</p>
              <p className="font-display text-3xl font-bold text-pink-600">{totals.prelim_him}</p>
            </div>
            <div className="bg-white/70 border border-pink-100 rounded-2xl p-4">
              <p className="font-body text-pink-400 text-xs">Preliminari (lei)</p>
              <p className="font-display text-3xl font-bold text-pink-600">{totals.prelim_her}</p>
            </div>
            <div className="bg-white/70 border border-pink-100 rounded-2xl p-4">
              <p className="font-body text-pink-400 text-xs">Venuti (lui)</p>
              <p className="font-display text-3xl font-bold text-pink-600">{totals.came_him}</p>
            </div>
            <div className="bg-white/70 border border-pink-100 rounded-2xl p-4 col-span-2">
              <p className="font-body text-pink-400 text-xs">Venuti (lei)</p>
              <p className="font-display text-3xl font-bold text-pink-600">{totals.came_her}</p>
            </div>
          </div>

          {selectedEvent ? (
            <div className="mt-4 bg-pink-50/60 border border-pink-100 rounded-2xl p-4">
              <p className="font-body text-pink-600 text-xs font-semibold mb-1">Quel giorno</p>
              <p className="font-body text-pink-700 text-sm">
                ❤️ {selectedEvent.love_count || 0} · ⚪️ {(Number(selectedEvent.prelim_him || 0) + Number(selectedEvent.prelim_her || 0)) || 0} · 💧{" "}
                {(Number(selectedEvent.came_him || 0) + Number(selectedEvent.came_her || 0)) || 0}
              </p>
            </div>
          ) : null}
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-5">
          <p className="font-body text-pink-700 text-sm font-semibold mb-3">Calendario</p>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-7 h-7 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2 mb-2">
                {weekdayLabels.map((w) => (
                  <div key={w} className="text-center font-body text-[11px] text-pink-400 font-semibold uppercase">
                    {w}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-2">
                {gridDays.map((day) => {
                  const iso = padIso(day)
                  const e = eventsByDate[iso] || null
                  const isOutside = !isSameMonth(day, currentMonth)
                  const selected = isSameDay(day, selectedDate)
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={`relative h-11 rounded-2xl border text-center font-body text-sm transition-all ${
                        selected
                          ? "bg-gradient-to-r from-pink-500 to-rose-500 text-white border-transparent shadow-md"
                          : isOutside
                            ? "bg-white/40 border-pink-50 text-pink-200"
                            : "bg-white/70 border-pink-100 text-pink-700 hover:bg-pink-50"
                      }`}
                    >
                      {renderIconStack(e)}
                      <span className="relative z-10">{format(day, "d", { locale: it })}</span>
                    </button>
                  )
                })}
              </div>

              <div className="mt-4 bg-white/70 border border-pink-100 rounded-2xl p-4">
                <p className="font-body text-pink-400 text-xs">
                  Legenda: ❤️ amore · ⚪️ preliminari · 💧 venuti (più gocce = più volte)
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
