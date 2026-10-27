import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '/api',
})

const TOKEN_KEY = 'kubex_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Drop the bad/expired token, but don't force-navigate — several
      // pages (Deploy GPU/CPU, Dashboard, etc.) are viewable without a
      // session and render their own "Sign in" prompt via useAuth().
      // AuthGuard still redirects to /signin for the pages that require one.
      clearToken()
    }
    return Promise.reject(error)
  },
)
