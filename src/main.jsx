import React from "react"
import ReactDOM from "react-dom/client"
import App from "@/App.jsx"
import "@/index.css"

function setIfPresent(selector, updater) {
  const el = document.querySelector(selector)
  if (el) updater(el)
}

function configureInstallUiForRoute(pathname) {
  const isAdmin = pathname === "/admin" || pathname === "/admin-login" || pathname.startsWith("/admin/")
  const next = isAdmin
    ? {
        manifest: "/admin-manifest.webmanifest",
        favicon: "/favicon-48.png",
        appleTouch: "/apple-touch-icon.png",
        appleTitle: "Deea Admin",
        appName: "Deea Admin",
        themeColor: "#fb7185",
        description: "Pannello Admin",
        title: "Deea Admin",
      }
    : {
        manifest: "/manifest.webmanifest",
        favicon: "/favicon-48-v2.png",
        appleTouch: "/apple-touch-icon-v2.png",
        appleTitle: "Deea",
        appName: "Deea",
        themeColor: "#f472b6",
        description: "Un posto solo per noi due 💗",
        title: "Deea",
      }

  setIfPresent("link#app-manifest", (el) => el.setAttribute("href", next.manifest))
  setIfPresent("link#app-favicon", (el) => el.setAttribute("href", next.favicon))
  setIfPresent("link#app-apple-touch-icon", (el) => el.setAttribute("href", next.appleTouch))
  setIfPresent("meta#app-apple-title", (el) => el.setAttribute("content", next.appleTitle))
  setIfPresent("meta#app-name", (el) => el.setAttribute("content", next.appName))
  setIfPresent("meta#app-theme-color", (el) => el.setAttribute("content", next.themeColor))
  setIfPresent("meta#app-description", (el) => el.setAttribute("content", next.description))
  document.title = next.title
}

if (typeof window !== "undefined") {
  configureInstallUiForRoute(window.location.pathname)

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {})
    })
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <App />
)
