import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage } from '../services/api'
import { ErrorBanner } from '../components/Feedback'

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="auth-page">
      <Link to="/" className="brand auth-brand"><span className="brand-icon">✳</span> CodeReview AI</Link>
      <div className="auth-card">
        <h1>{title}</h1>
        <p className="muted">{subtitle}</p>
        {children}
        <p className="auth-footer">{footer}</p>
      </div>
    </div>
  )
}

function Field({ label, error, ...input }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input {...input} aria-invalid={Boolean(error)} />
      {error && <small className="field-error">{error}</small>}
    </label>
  )
}

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await login(form)
      navigate(location.state?.from || '/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to see your reviews and run new ones."
      footer={<>New here? <Link to="/register">Create an account</Link></>}>
      <form onSubmit={submit} noValidate>
        <ErrorBanner message={error} />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} required />
        <button className="btn btn-primary btn-block" disabled={busy || !form.email || !form.password}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthShell>
  )
}

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const problems = {}
  if (form.password && (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)))
    problems.password = 'At least 8 characters, with a letter and a number'
  if (form.confirm && form.confirm !== form.password) problems.confirm = 'Passwords do not match'
  const valid = form.name.trim().length >= 2 && form.email && form.password && form.confirm && Object.keys(problems).length === 0

  async function submit(e) {
    e.preventDefault()
    if (!valid) return
    setError('')
    setBusy(true)
    try {
      await register({ name: form.name, email: form.email, password: form.password })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setBusy(false)
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="Your reviews are saved privately to your account."
      footer={<>Already registered? <Link to="/login">Sign in</Link></>}>
      <form onSubmit={submit} noValidate>
        <ErrorBanner message={error} />
        <Field label="Name" autoComplete="name" value={form.name} onChange={set('name')} required />
        <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} required />
        <Field label="Password" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={problems.password} required />
        <Field label="Confirm password" type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} error={problems.confirm} required />
        <button className="btn btn-primary btn-block" disabled={busy || !valid}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthShell>
  )
}
