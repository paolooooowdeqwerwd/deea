import { useEffect } from "react"
import { useLocation, useNavigationType } from "react-router-dom"

const getHashId = (hash) => {
  const rawId = hash.slice(1)

  try {
    return decodeURIComponent(rawId)
  } catch {
    return rawId
  }
}

export default function ScrollToTop() {
  const { pathname, hash } = useLocation()
  const navigationType = useNavigationType()

  useEffect(() => {
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

    const setIfPresent = (selector, updater) => {
      const el = document.querySelector(selector)
      if (el) updater(el)
    }

    setIfPresent("link#app-manifest", (el) => el.setAttribute("href", next.manifest))
    setIfPresent("link#app-favicon", (el) => el.setAttribute("href", next.favicon))
    setIfPresent("link#app-apple-touch-icon", (el) => el.setAttribute("href", next.appleTouch))
    setIfPresent("meta#app-apple-title", (el) => el.setAttribute("content", next.appleTitle))
    setIfPresent("meta#app-name", (el) => el.setAttribute("content", next.appName))
    setIfPresent("meta#app-theme-color", (el) => el.setAttribute("content", next.themeColor))
    setIfPresent("meta#app-description", (el) => el.setAttribute("content", next.description))
    document.title = next.title
  }, [pathname])

  useEffect(() => {
    if (navigationType === "POP") return

    if (hash) {
      const id = getHashId(hash)
      const timer = window.setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
      }, 50)
      return () => window.clearTimeout(timer)
    }

    window.scrollTo({ top: 0, left: 0, behavior: "instant" })
  }, [pathname, hash, navigationType])

  return null
}
