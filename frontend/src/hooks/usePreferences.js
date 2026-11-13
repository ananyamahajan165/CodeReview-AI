import { useCallback, useState } from 'react'

const KEY = 'codereview_prefs'
const DEFAULTS = { defaultLanguage: 'JavaScript', editorFontSize: 13, confirmDelete: true }

function read() {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') } } catch { return DEFAULTS }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState(read)
  const update = useCallback((patch) => {
    setPrefs((p) => {
      const next = { ...p, ...patch }
      try { localStorage.setItem(KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
      return next
    })
  }, [])
  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY) } catch { /* storage unavailable */ }
    setPrefs(DEFAULTS)
  }, [])
  return { prefs, update, reset }
}
