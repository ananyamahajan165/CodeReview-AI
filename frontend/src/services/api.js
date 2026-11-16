import axios from 'axios'

export const TOKEN_KEY = 'codereview_token'

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* storage unavailable */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* storage unavailable */ } },
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 90000, // AI reviews can take a while
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAuthForm = /\/auth\/(login|register)$/.test(err.config?.url || '')
    if (err.response?.status === 401 && !isAuthForm) onUnauthorized()
    return Promise.reject(err)
  }
)

// Turns any failure into a message that is safe and useful to show the user.
export function getErrorMessage(err) {
  if (err.response) {
    const { message, details } = err.response.data || {}
    const first = details?.[0]?.message
    return first && message === 'Validation failed' ? first : message || `Request failed (${err.response.status})`
  }
  if (err.code === 'ECONNABORTED') return 'The request timed out. Please try again.'
  return 'Cannot reach the server. Check your connection and that the backend is running.'
}

export default api
