import { cloudAdminLogin, cloudLogin, tokenStorage } from "@/api/cloudClient"

export async function login(name, password) {
  const data = await cloudLogin({ name, password })
  if (data?.token) {
    tokenStorage.setUserToken(data.token)
    return true
  }
  return false
}

export function logout() {
  tokenStorage.clearUserToken()
}

export function isLoggedIn() {
  return Boolean(tokenStorage.getUserToken())
}

export async function adminLogin(password) {
  const data = await cloudAdminLogin({ password })
  if (data?.token) {
    tokenStorage.setAdminToken(data.token)
    return true
  }
  return false
}

export function isAdminLoggedIn() {
  return Boolean(tokenStorage.getAdminToken())
}

export function adminLogout() {
  tokenStorage.clearAdminToken()
}
