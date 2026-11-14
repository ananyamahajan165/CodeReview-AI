import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ConfirmDialog from '../components/Modal'
import { EmptyState, ErrorBanner, Spinner } from '../components/Feedback'
import { useToast } from '../context/ToastContext'
import { useDebounce } from '../hooks/useDebounce'
import { usePreferences } from '../hooks/usePreferences'
import { reviewService } from '../services'
import { getErrorMessage } from '../services/api'
import { LANGUAGE_NAMES } from '../utils/languages'
import { formatDate, scoreTone } from '../utils/format'

export default function HistoryPage() {
  const toast = useToast()
  const { prefs } = usePreferences()
  const [params, setParams] = useSearchParams()
  const [search, setSearch] = useState(params.get('search') || '')
  const language = params.get('language') || 'all'
  const sort = params.get('sort') || 'newest'
  const page = Number(params.get('page')) || 1
  const debouncedSearch = useDebounce(search)

  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const setParam = (patch) => {
    const next = new URLSearchParams(params)
    Object.entries({ page: '', ...patch }).forEach(([k, v]) => (v && v !== 'all' && v !== 'newest' && v !== '1' ? next.set(k, v) : next.delete(k)))
    setParams(next, { replace: true })
  }

  // Keep URL in sync with the debounced search term
  useEffect(() => {
    if ((params.get('search') || '') !== debouncedSearch) setParam({ search: debouncedSearch })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    reviewService.list({ search: params.get('search') || undefined, language, sort, page, limit: 10 })
      .then(setData)
      .catch((e) => setError(getErrorMessage(e)))
      .finally(() => setLoading(false))
  }, [params, language, sort, page])
  useEffect(load, [load])

  async function doDelete(id) {
    setDeleting(true)
    try {
      await reviewService.remove(id)
      toast.success('Review deleted')
      setToDelete(null)
      load()
    } catch (e) { toast.error(getErrorMessage(e)) }
    finally { setDeleting(false) }
  }
  const onDeleteClick = (r) => (prefs.confirmDelete ? setToDelete(r) : doDelete(r._id))
  const filtered = Boolean(params.get('search')) || language !== 'all'

  return (
    <>
      <PageHeader eyebrow="History" title="Review history">
        <Link className="btn btn-primary" to="/review">✦ New review</Link>
      </PageHeader>
      <section className="content">
        <div className="filters">
          <input type="search" placeholder="Search summaries, issues and code…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search reviews" />
          <select value={language} onChange={(e) => setParam({ language: e.target.value })} aria-label="Filter by language">
            <option value="all">All languages</option>
            {LANGUAGE_NAMES.map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={sort} onChange={(e) => setParam({ sort: e.target.value })} aria-label="Sort reviews">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="score-high">Highest score</option>
            <option value="score-low">Lowest score</option>
          </select>
        </div>

        <ErrorBanner message={error} onRetry={load} />
        {loading && !data && <Spinner label="Loading reviews…" />}

        {data && data.reviews.length === 0 && !error && (
          filtered
            ? <EmptyState title="No matching reviews" action={<button className="btn btn-ghost" onClick={() => { setSearch(''); setParams({}, { replace: true }) }}>Clear filters</button>}>Try a different search or language.</EmptyState>
            : <EmptyState title="No reviews yet" action={<Link className="btn btn-primary" to="/review">Run your first review</Link>}>Every review you run is saved here.</EmptyState>
        )}

        {data && data.reviews.length > 0 && (
          <>
            <ul className={`history-list ${loading ? 'is-loading' : ''}`}>
              {data.reviews.map((r) => (
                <li key={r._id} className="history-item">
                  <Link to={`/history/${r._id}`} className="history-main">
                    <span className={`score-pill tone-${scoreTone(r.score)}`}>{r.score}</span>
                    <span className="recent-main">
                      <strong>{r.programmingLanguage} <span className="muted small">· {formatDate(r.createdAt)}</span></strong>
                      <span className="muted clamp">{r.reviewSummary}</span>
                    </span>
                    <span className="chips">
                      {r.criticalCount > 0 && <span className="chip chip-critical">{r.criticalCount} critical</span>}
                      {r.warningCount > 0 && <span className="chip chip-warning">{r.warningCount} warn</span>}
                    </span>
                  </Link>
                  <button className="btn btn-danger-ghost btn-sm" onClick={() => onDeleteClick(r)} aria-label={`Delete ${r.programmingLanguage} review from ${formatDate(r.createdAt)}`}>Delete</button>
                </li>
              ))}
            </ul>
            <div className="pager">
              <span className="muted small">{data.total} review{data.total === 1 ? '' : 's'}</span>
              <div className="btn-row">
                <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setParam({ page: String(page - 1) })}>Previous</button>
                <span className="muted small">Page {data.page} of {data.pages}</span>
                <button className="btn btn-ghost btn-sm" disabled={page >= data.pages} onClick={() => setParam({ page: String(page + 1) })}>Next</button>
              </div>
            </div>
          </>
        )}
      </section>
      {toDelete && <ConfirmDialog title="Delete this review?" message={`The ${toDelete.programmingLanguage} review from ${formatDate(toDelete.createdAt)} will be permanently removed.`} busy={deleting} onConfirm={() => doDelete(toDelete._id)} onCancel={() => setToDelete(null)} />}
    </>
  )
}
