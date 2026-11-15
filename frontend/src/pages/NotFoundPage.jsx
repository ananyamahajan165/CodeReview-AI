import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="auth-page">
      <div className="auth-card center-text">
        <p className="big-404">404</p>
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist or has moved.</p>
        <Link className="btn btn-primary" to="/">Back to home</Link>
      </div>
    </div>
  )
}
