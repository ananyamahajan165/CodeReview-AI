import PageHeader from '../components/PageHeader'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../hooks/usePreferences'
import { LANGUAGE_NAMES } from '../utils/languages'
import { useNavigate } from 'react-router-dom'

export default function SettingsPage() {
  const { prefs, update, reset } = usePreferences()
  const { logout } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  return (
    <>
      <PageHeader eyebrow="Preferences" title="Settings" />
      <section className="content narrow">
        <div className="panel">
          <h3>Editor</h3>
          <p className="muted small">Saved in this browser only.</p>
          <label className="field"><span>Default language</span>
            <select value={prefs.defaultLanguage} onChange={(e) => update({ defaultLanguage: e.target.value })}>
              {LANGUAGE_NAMES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="field"><span>Editor font size: {prefs.editorFontSize}px</span>
            <input type="range" min="11" max="20" value={prefs.editorFontSize} onChange={(e) => update({ editorFontSize: Number(e.target.value) })} />
          </label>
        </div>
        <div className="panel">
          <h3>History</h3>
          <label className="check">
            <input type="checkbox" checked={prefs.confirmDelete} onChange={(e) => update({ confirmDelete: e.target.checked })} />
            <span>Ask for confirmation before deleting a review</span>
          </label>
        </div>
        <div className="panel">
          <h3>Session</h3>
          <div className="btn-row">
            <button className="btn btn-ghost" onClick={() => { reset(); toast.success('Preferences reset') }}>Reset preferences</button>
            <button className="btn btn-danger-ghost" onClick={() => { logout(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </section>
    </>
  )
}
