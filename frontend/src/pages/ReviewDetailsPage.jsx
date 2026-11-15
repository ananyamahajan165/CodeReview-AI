import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ReviewResult from '../components/ReviewResult'
import ConfirmDialog from '../components/Modal'
import { ErrorBanner, Spinner } from '../components/Feedback'
import { useToast } from '../context/ToastContext'
import { reviewService } from '../services'
import { getErrorMessage } from '../services/api'
import { formatDateTime } from '../utils/format'

export default function ReviewDetailsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(() => {
    reviewService.get(id).then(setReview).catch((err) => {
      if (err.response?.status === 404 || err.response?.status === 400) setNotFound(true)
      else setError(getErrorMessage(err))
    })
  }, [id])
  useEffect(load, [load])
  const retry = () => { setError(''); load() }

  async function remove() {
    setDeleting(true)
    try {
      await reviewService.remove(id)
      toast.success('Review deleted')
      navigate('/history', { replace: true })
    } catch (err) {
      toast.error(getErrorMessage(err))
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (notFound) return (
    <section className="content"><div className="empty"><h3>Review not found</h3><p>It may have been deleted, or it belongs to another account.</p><Link className="btn btn-primary" to="/history">Back to history</Link></div></section>
  )

  return (
    <>
      <PageHeader eyebrow={review ? `${review.programmingLanguage} · ${formatDateTime(review.createdAt)}` : 'Review'} title="Review details">
        {review && (
          <>
            <Link className="btn btn-ghost" to="/review" state={{ code: review.submittedCode, language: review.programmingLanguage }}>Re-review this code</Link>
            <button className="btn btn-danger-ghost" onClick={() => setConfirming(true)}>Delete</button>
          </>
        )}
      </PageHeader>
      <section className="content">
        <p><Link to="/history" className="back-link">← All reviews</Link></p>
        <ErrorBanner message={error} onRetry={retry} />
        {!review && !error && <Spinner label="Loading review…" />}
        {review && <ReviewResult review={review} showOriginal />}
      </section>
      {confirming && <ConfirmDialog title="Delete this review?" message="The submitted code and AI results will be permanently removed." busy={deleting} onConfirm={remove} onCancel={() => setConfirming(false)} />}
    </>
  )
}
