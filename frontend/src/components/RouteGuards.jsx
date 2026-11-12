import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './Feedback'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="fullpage"><Spinner label="Checking your session…" /></div>
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Login/register are pointless for signed-in users
export function GuestRoute() {
  const { user, loading } = useAuth()
  if (loading) return <div className="fullpage"><Spinner label="Checking your session…" /></div>
  if (user) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
