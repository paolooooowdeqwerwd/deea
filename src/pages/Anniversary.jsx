import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { isLoggedIn } from "@/lib/auth";
import { Heart } from "lucide-react";
import { differenceInDays, differenceInWeeks, differenceInMonths, differenceInYears, format, parseISO } from "date-fns";
import { it } from "date-fns/locale";

const LOCAL_RELATIONSHIP_DATE_KEY = "deea_relationship_date"

function getLocalRelationshipDate() {
  try {
    const raw = localStorage.getItem(LOCAL_RELATIONSHIP_DATE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function setLocalRelationshipDate(record) {
  localStorage.setItem(LOCAL_RELATIONSHIP_DATE_KEY, JSON.stringify(record))
}

function clearLocalRelationshipDate() {
  localStorage.removeItem(LOCAL_RELATIONSHIP_DATE_KEY)
}

export default function Anniversary() {
  const navigate = useNavigate();
  const [relationshipDate, setRelationshipDate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [now, setNow] = useState(new Date());
  const [notifAsked, setNotifAsked] = useState(false);

  useEffect(() => {
    if (!isLoggedIn()) { navigate("/login"); return; }
    loadDate();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  async function loadDate() {
    setLoading(true);
    if (!appParams.appId) {
      const local = getLocalRelationshipDate()
      if (local?.start_date) {
        setRelationshipDate(local)
        setEditing(false)
      } else {
        setRelationshipDate(null)
        setEditing(true)
      }
      setLoading(false)
      return
    }
    try {
      const records = await base44.entities.RelationshipDate.list();
      if (records && records.length > 0) {
        setRelationshipDate(records[0]);
        setEditing(false);
      } else {
        setRelationshipDate(null);
        setEditing(true);
      }
    } catch (e) {
      const local = getLocalRelationshipDate()
      if (local?.start_date) {
        setRelationshipDate(local)
        setEditing(false)
      } else {
        setRelationshipDate(null)
        setEditing(true)
      }
    }
    setLoading(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!day || !month || !year) return;
    const d = String(day).padStart(2, "0");
    const m = String(month).padStart(2, "0");
    const dateStr = `${year}-${m}-${d}`;
    setSaving(true);
    if (!appParams.appId) {
      const localRecord = { id: "local", start_date: dateStr, set_by: "andreea" }
      setLocalRelationshipDate(localRecord)
      setRelationshipDate(localRecord)
      setEditing(false)
      setNotifAsked(true)
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission()
      }
      setSaving(false)
      return
    }
    try {
      const existing = await base44.entities.RelationshipDate.list();
      if (existing && existing.length > 0) {
        await base44.entities.RelationshipDate.update(existing[0].id, { start_date: dateStr, set_by: "andreea" });
      } else {
        await base44.entities.RelationshipDate.create({ start_date: dateStr, set_by: "andreea" });
      }
      await loadDate();
      setEditing(false);
      // Ask for notifications
      setNotifAsked(true);
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
      }
    } catch (e) {
      const localRecord = { id: "local", start_date: dateStr, set_by: "andreea" }
      setLocalRelationshipDate(localRecord)
      setRelationshipDate(localRecord)
      setEditing(false)
      setNotifAsked(true)
      if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission()
      }
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!relationshipDate?.id) return;
    const ok = window.confirm("Vuoi davvero rimuovere la data? (Poi potrai inserirla di nuovo)");
    if (!ok) return;
    setDeleting(true);
    if (!appParams.appId) {
      clearLocalRelationshipDate()
      setRelationshipDate(null)
      setDay("")
      setMonth("")
      setYear("")
      setEditing(true)
      setDeleting(false)
      return
    }
    try {
      await base44.entities.RelationshipDate.delete(relationshipDate.id);
      setRelationshipDate(null);
      setDay("");
      setMonth("");
      setYear("");
      setEditing(true);
    } catch (e) {
      clearLocalRelationshipDate()
      setRelationshipDate(null)
      setDay("")
      setMonth("")
      setYear("")
      setEditing(true)
    }
    setDeleting(false);
  }

  function getStats() {
    if (!relationshipDate) return null;
    const start = parseISO(relationshipDate.start_date);
    const days = differenceInDays(now, start);
    const weeks = differenceInWeeks(now, start);
    const months = differenceInMonths(now, start);
    const years = differenceInYears(now, start);
    return { days, weeks, months, years, start };
  }

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-6 pb-12">
      {/* Title */}
      <div className="text-center mb-8">
        <div className="text-4xl mb-3">💑</div>
        <h1 className="font-display text-3xl font-bold text-pink-600 italic">Da quanto stiamo assieme</h1>
        <p className="font-body text-pink-400 text-sm mt-2">Il nostro viaggio insieme 🌹</p>
      </div>

      {/* Date picker form */}
      {editing ? (
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-xl border border-pink-100 p-6 w-full max-w-sm mb-6">
          <p className="font-body text-pink-600 text-sm text-center mb-5 font-medium">
            Inserisci la data in cui ci siamo fidanzati 💗
          </p>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-pink-400 mb-1 uppercase tracking-wider">Giorno</label>
                <input
                  type="number" min="1" max="31"
                  value={day} onChange={(e) => setDay(e.target.value)}
                  placeholder="GG"
                  className="w-full px-3 py-3 rounded-xl border border-pink-200 bg-pink-50/50 text-pink-800 text-center font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pink-400 mb-1 uppercase tracking-wider">Mese</label>
                <input
                  type="number" min="1" max="12"
                  value={month} onChange={(e) => setMonth(e.target.value)}
                  placeholder="MM"
                  className="w-full px-3 py-3 rounded-xl border border-pink-200 bg-pink-50/50 text-pink-800 text-center font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-pink-400 mb-1 uppercase tracking-wider">Anno</label>
                <input
                  type="number" min="2000" max="2099"
                  value={year} onChange={(e) => setYear(e.target.value)}
                  placeholder="AAAA"
                  className="w-full px-3 py-3 rounded-xl border border-pink-200 bg-pink-50/50 text-pink-800 text-center font-body text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving || !day || !month || !year}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-body font-semibold py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Heart size={18} className="fill-white" />
                  Invia 💕
                </>
              )}
            </button>
          </form>
          {notifAsked && (
            <p className="text-pink-400 text-xs text-center mt-3 font-body">
              🔔 Riceverai una notifica ogni mesiversario e ogni anniversario!
            </p>
          )}
          {relationshipDate && (
            <button
              onClick={() => setEditing(false)}
              className="text-pink-400 text-sm font-body underline text-center mt-4 hover:text-pink-600 transition-colors w-full"
              type="button"
            >
              Annulla
            </button>
          )}
        </div>
      ) : null}

      {/* Stats */}
      {stats && !editing && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          {/* Main counter */}
          <div className="bg-gradient-to-br from-pink-500 to-rose-500 rounded-3xl shadow-xl p-6 text-white text-center">
            <p className="font-body text-pink-100 text-sm mb-1 uppercase tracking-wider">Stiamo assieme da</p>
            <div className="flex items-baseline justify-center gap-2">
              <span className="font-display text-6xl font-bold">{stats.days}</span>
              <span className="font-display text-2xl font-semibold">giorni</span>
            </div>
            <p className="font-display italic text-pink-200 text-sm mt-2">
              Dal {format(stats.start, "d MMMM yyyy", { locale: it })} 🌸
            </p>
          </div>

          {/* Grid stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-pink-100 p-4 text-center">
              <p className="font-display text-3xl font-bold text-pink-600">{stats.weeks}</p>
              <p className="font-body text-pink-400 text-xs mt-1">settimane</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-pink-100 p-4 text-center">
              <p className="font-display text-3xl font-bold text-rose-500">{stats.months}</p>
              <p className="font-body text-pink-400 text-xs mt-1">mesi</p>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-md border border-pink-100 p-4 text-center">
              <p className="font-display text-3xl font-bold text-pink-600">{stats.years}</p>
              <p className="font-body text-pink-400 text-xs mt-1">anni</p>
            </div>
          </div>

          {/* Quote */}
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl border border-pink-100 p-5 text-center">
            <p className="font-display italic text-pink-500 text-base leading-relaxed">
              "Ogni giorno con te è il più bello della mia vita" 💗
            </p>
          </div>

          {/* Change date button */}
          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={() => {
                const d = parseISO(relationshipDate.start_date);
                setDay(String(d.getDate()));
                setMonth(String(d.getMonth() + 1));
                setYear(String(d.getFullYear()));
                setEditing(true);
              }}
              className="text-pink-400 text-sm font-body underline text-center hover:text-pink-600 transition-colors"
              type="button"
            >
              Modifica la data
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="text-rose-400 text-sm font-body underline text-center hover:text-rose-500 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              type="button"
            >
              {deleting ? "Rimozione..." : "Rimuovi la data"}
            </button>
          </div>
        </div>
      )}

      {/* If no date yet, show placeholder */}
      {!stats && !loading && (
        <div className="text-center mt-4">
          <p className="font-display italic text-pink-300 text-base">
            Inserisci la data per vedere il nostro countdown 💕
          </p>
        </div>
      )}
    </div>
  );
}
