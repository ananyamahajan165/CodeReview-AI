import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: '▦' },
  { to: '/review', label: 'Code Review', icon: '⌘' },
  { to: '/history', label: 'Review History', icon: '◷' },
  { to: '/profile', label: 'Profile', icon: '☺' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/dashboard" className="brand"><span className="brand-icon">✳</span><span className="brand-text">CodeReview AI</span></NavLink>
        <button className="new-review" onClick={() => navigate('/review')} aria-label="New review">
          <span>+</span><span className="label"> New Review</span>
        </button>
        <p className="nav-label">Workspace</p>
        <nav>
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`} title={n.label}>
              <span className="nav-icon" aria-hidden="true">{n.icon}</span><span className="label">{n.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="avatar" aria-hidden="true">{user?.name?.[0]?.toUpperCase()}</div>
          <div className="label user-meta">
            <strong>{user?.name}</strong>
            <button className="link-btn" onClick={() => { logout(); navigate('/') }}>Sign out</button>
          </div>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
