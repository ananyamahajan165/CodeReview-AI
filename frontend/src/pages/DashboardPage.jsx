import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import { EmptyState, ErrorBanner, Spinner } from '../components/Feedback'
import { useAuth } from '../context/AuthContext'
import { dashboardService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatDate, scoreTone } from '../utils/format'

function StatCard({ label, value, hint, tone }) {
  return (
    <div className={`stat-card ${tone ? `stat-${tone}` : ''}`}>
      <span>{label}</span>
      <strong className="stat-value">{value}</strong>
      <small>{hint}</small>
    </div>
  )
}

function ActivityChart({ days }) {
  const max = Math.max(1, ...days.map((d) => d.count))
  return (
    <div className="activity" role="img" aria-label="Reviews per day over the last 14 days">
      {days.map((d) => (
        <div key={d.date} className="bar-col" title={`${formatDate(d.date)}: ${d.count} review${d.count === 1 ? '' : 's'}`}>
          <div className="bar" style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, opacity: d.count ? 1 : 0.25 }} />
          <small>{new Date(d.date + 'T00:00:00Z').getUTCDate()}</small>
        </div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    dashboardService.stats().then(setStats).catch((e) => setError(getErrorMessage(e)))
  }, [])
  useEffect(load, [load])
  const retry = () => { setError(''); load() }

  return (
    <>
      <PageHeader eyebrow="Dashboard" title={`Hello, ${user?.name?.split(' ')[0] || 'there'}`}>
        <Link className="btn btn-primary" to="/review">✦ New review</Link>
      </PageHeader>
      <section className="content">
        <ErrorBanner message={error} onRetry={retry} />
        {!stats && !error && <Spinner label="Loading your stats…" />}
        {stats && (
          <>
            <div className="stats stats-4">
              <StatCard label="Reviews performed" value={stats.totalReviews} hint="All time" />
              <StatCard label="Bugs detected" value={stats.totalBugs} hint="Logic errors and defects" />
              <StatCard label="Critical issues" value={stats.criticalIssues} hint="Needs attention first" tone={stats.criticalIssues ? 'danger' : ''} />
              <StatCard label="Average score" value={stats.totalReviews ? stats.averageScore : '–'} hint="Out of 100" tone={stats.totalReviews ? scoreTone(stats.averageScore) : ''} />
            </div>

            {stats.totalReviews === 0 ? (
              <EmptyState title="No reviews yet" action={<Link className="btn btn-primary" to="/review">Run your first review</Link>}>
                Paste some code and your stats, language breakdown and history will appear here.
              </EmptyState>
            ) : (
              <div className="dash-grid">
                <section className="panel">
                  <h3>Review activity <span className="muted small">last 14 days</span></h3>
                  <ActivityChart days={stats.activity} />
                </section>
                <section className="panel">
                  <h3>Languages</h3>
                  <ul className="lang-list">
                    {stats.languages.map((l) => (
                      <li key={l.language}>
                        <div className="lang-row"><span>{l.language}</span><span className="muted small">{l.count} · avg {l.averageScore}</span></div>
                        <div className="meter"><i style={{ width: `${(l.count / stats.languages[0].count) * 100}%` }} /></div>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="panel span-2">
                  <div className="panel-head"><h3>Recent reviews</h3><Link className="back-link" to="/history">View all</Link></div>
                  <ul className="recent-list">
                    {stats.recentReviews.map((r) => (
                      <li key={r._id}>
                        <Link to={`/history/${r._id}`}>
                          <span className={`score-pill tone-${scoreTone(r.score)}`}>{r.score}</span>
                          <span className="recent-main"><strong>{r.programmingLanguage}</strong><span className="muted clamp">{r.reviewSummary}</span></span>
                          <span className="muted small">{formatDate(r.createdAt)}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            )}
          </>
        )}
      </section>
    </>
  )
}
