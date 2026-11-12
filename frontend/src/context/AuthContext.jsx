import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services'
import { setUnauthorizedHandler, tokenStore } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(tokenStore.get()))

  const logout = useCallback(() => { tokenStore.clear(); setUser(null) }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!tokenStore.get()) return
    let cancelled = false
    authService.me()
      .then((u) => !cancelled && setUser(u))
      .catch(() => !cancelled && logout())
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [logout])

  const authenticate = useCallback(async (request) => {
    const { token, user: u } = await request()
    tokenStore.set(token)
    setUser(u)
    return u
  }, [])

  const value = useMemo(() => ({
    user, loading, logout, setUser,
    login: (creds) => authenticate(() => authService.login(creds)),
    register: (data) => authenticate(() => authService.register(data)),
  }), [user, loading, logout, authenticate])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
