import { useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import { ErrorBanner, Spinner } from '../components/Feedback'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { userService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatDate } from '../utils/format'

export default function ProfilePage() {
  const { setUser } = useAuth()
  const toast = useToast()
  const [profile, setProfile] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [info, setInfo] = useState({ name: '', email: '' })
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' })
  const [infoError, setInfoError] = useState('')
  const [pwError, setPwError] = useState('')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    userService.profile()
      .then((p) => { setProfile(p); setInfo({ name: p.name, email: p.email }) })
      .catch((e) => setLoadError(getErrorMessage(e)))
  }, [])

  async function saveInfo(e) {
    e.preventDefault()
    setInfoError(''); setBusy('info')
    try {
      const u = await userService.update(info)
      setUser(u); setProfile((p) => ({ ...p, ...u }))
      toast.success('Profile updated')
    } catch (err) { setInfoError(getErrorMessage(err)) }
    finally { setBusy('') }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPwError(''); setBusy('pw')
    try {
      await userService.update(pw)
      setPw({ currentPassword: '', newPassword: '' })
      toast.success('Password changed')
    } catch (err) { setPwError(getErrorMessage(err)) }
    finally { setBusy('') }
  }

  return (
    <>
      <PageHeader eyebrow="Account" title="Your profile" />
      <section className="content narrow">
        <ErrorBanner message={loadError} />
        {!profile && !loadError && <Spinner />}
        {profile && (
          <>
            <div className="panel profile-summary">
              <div className="avatar avatar-lg" aria-hidden="true">{profile.name[0]?.toUpperCase()}</div>
              <div>
                <h3>{profile.name}</h3>
                <p className="muted">{profile.email}</p>
                <p className="muted small">Member since {formatDate(profile.createdAt)} · {profile.reviewCount} review{profile.reviewCount === 1 ? '' : 's'}</p>
              </div>
            </div>

            <form className="panel" onSubmit={saveInfo}>
              <h3>Personal information</h3>
              <ErrorBanner message={infoError} />
              <label className="field"><span>Name</span><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} required minLength={2} maxLength={60} /></label>
              <label className="field"><span>Email</span><input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required /></label>
              <button className="btn btn-primary" disabled={busy === 'info' || (info.name === profile.name && info.email === profile.email)}>{busy === 'info' ? 'Saving…' : 'Save changes'}</button>
            </form>

            <form className="panel" onSubmit={savePassword}>
              <h3>Change password</h3>
              <ErrorBanner message={pwError} />
              <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required /></label>
              <label className="field"><span>New password</span><input type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required minLength={8} /><small className="muted">At least 8 characters, with a letter and a number.</small></label>
              <button className="btn btn-primary" disabled={busy === 'pw' || !pw.currentPassword || !pw.newPassword}>{busy === 'pw' ? 'Updating…' : 'Update password'}</button>
            </form>
          </>
        )}
      </section>
    </>
  )
}
