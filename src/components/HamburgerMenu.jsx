import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Heart, Calendar, Home, Smile, LogOut, LogIn } from "lucide-react";
import { isLoggedIn, logout } from "@/lib/auth";

export default function HamburgerMenu() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setLoggedIn(isLoggedIn());
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleLogout() {
    logout();
    setLoggedIn(false);
    setOpen(false);
    navigate("/");
  }

  const isOnAnniversary = location.pathname === "/anniversary";
  const isOnCalendar = location.pathname === "/calendar";
  const isOnMood = location.pathname === "/mood";
  const shouldShowHomeSwap = isOnAnniversary || isOnMood || isOnCalendar;
  const shouldShowAnniversary = !isOnAnniversary;
  const shouldShowCalendar = !isOnCalendar;
  const shouldShowMood = !isOnMood;

  return (
    <div className="relative z-50" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl bg-white/80 backdrop-blur-sm shadow-md border border-pink-100 text-pink-500 hover:bg-pink-50 transition-all duration-200"
      >
        {open ? <X size={22} /> : <Menu size={22} />}
      </button>

      {open && (
        <div className="absolute left-0 top-12 w-64 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl border border-pink-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-pink-400 to-rose-400 px-4 py-3">
            <p className="text-white font-display font-semibold text-sm flex items-center gap-2">
              <Heart size={14} className="fill-white" />
              Deea — per Andreea 💕
            </p>
          </div>

          <div className="py-2">
            {!loggedIn ? (
              <Link
                to="/login"
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-pink-700 hover:bg-pink-50 transition-colors font-body text-sm"
              >
                <LogIn size={16} className="text-pink-400" />
                <span>Log in (Andreea)</span>
              </Link>
            ) : (
              <>
                {shouldShowHomeSwap && (
                  <Link
                    to="/"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-pink-700 hover:bg-pink-50 transition-colors font-body text-sm"
                  >
                    <Home size={16} className="text-pink-400" />
                    <span>Home</span>
                  </Link>
                )}
                {shouldShowAnniversary && (
                  <Link
                    to="/anniversary"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-pink-700 hover:bg-pink-50 transition-colors font-body text-sm"
                  >
                    <Calendar size={16} className="text-pink-400" />
                    <span>Da quanto stiamo assieme</span>
                  </Link>
                )}
                {shouldShowCalendar && (
                  <Link
                    to="/calendar"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-pink-700 hover:bg-pink-50 transition-colors font-body text-sm"
                  >
                    <Calendar size={16} className="text-pink-400" />
                    <span>Calendario 😈</span>
                  </Link>
                )}
                {shouldShowMood && (
                  <Link
                    to="/mood"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 px-4 py-3 text-pink-700 hover:bg-pink-50 transition-colors font-body text-sm"
                  >
                    <Smile size={16} className="text-pink-400" />
                    <span>Dimmi il tuo stato d'animo</span>
                  </Link>
                )}
                <div className="border-t border-pink-100 mt-2 pt-2">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 text-rose-500 hover:bg-rose-50 transition-colors font-body text-sm w-full text-left"
                  >
                    <LogOut size={16} />
                    <span>Esci</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
