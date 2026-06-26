const AUTH_KEY = "deea_auth"
const ADMIN_AUTH_KEY = "deea_admin_auth"

const CORRECT_NAME = import.meta.env.VITE_DEEA_NAME ?? ""
const CORRECT_PASSWORD = import.meta.env.VITE_DEEA_PASSWORD ?? ""
const ADMIN_PASSWORD = import.meta.env.VITE_DEEA_ADMIN_PASSWORD ?? ""

export function login(name, password) {
  if (!CORRECT_NAME || !CORRECT_PASSWORD) return false

  if (
    name.trim().toLowerCase() === CORRECT_NAME.trim().toLowerCase() &&
    password === CORRECT_PASSWORD
  ) {
    localStorage.setItem(AUTH_KEY, "true")
    return true
  }
  return false
}

export function logout() {
  localStorage.removeItem(AUTH_KEY)
}

export function isLoggedIn() {
  return localStorage.getItem(AUTH_KEY) === "true"
}

export function adminLogin(password) {
  if (!ADMIN_PASSWORD) return false

  if (password === ADMIN_PASSWORD) {
    sessionStorage.setItem(ADMIN_AUTH_KEY, "true")
    return true
  }
  return false
}

export function isAdminLoggedIn() {
  return sessionStorage.getItem(ADMIN_AUTH_KEY) === "true"
}

export function adminLogout() {
  sessionStorage.removeItem(ADMIN_AUTH_KEY)
}
