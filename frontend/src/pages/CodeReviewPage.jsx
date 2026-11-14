import { useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ReviewResult from '../components/ReviewResult'
import { ErrorBanner } from '../components/Feedback'
import { useToast } from '../context/ToastContext'
import { usePreferences } from '../hooks/usePreferences'
import { reviewService } from '../services'
import { getErrorMessage } from '../services/api'
import { LANGUAGE_NAMES, MAX_CODE_CHARS, extensionFor } from '../utils/languages'
import { downloadText } from '../utils/format'

export default function CodeReviewPage() {
  const location = useLocation()
  const toast = useToast()
  const { prefs } = usePreferences()
  const [code, setCode] = useState(location.state?.code || '')
  const [language, setLanguage] = useState(location.state?.language || prefs.defaultLanguage)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [review, setReview] = useState(null)
  const resultRef = useRef(null)

  const lineCount = code.trim() === '' ? 0 : code.split('\n').length
  const tooLong = code.length > MAX_CODE_CHARS
  const canSubmit = code.trim().length >= 5 && !tooLong && !busy

  const edit = (value) => { setCode(value); setReview(null); setError('') }

  async function submit() {
    setBusy(true)
    setError('')
    setReview(null)
    try {
      const saved = await reviewService.create({ programmingLanguage: language, code })
      setReview(saved)
      toast.success('Review complete and saved to your history')
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    } catch (err) {
      // No result is shown on failure — only the real error.
      setError(getErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(code); toast.success('Code copied') }
    catch { toast.error('Could not copy. Please copy manually.') }
  }

  return (
    <>
      <PageHeader eyebrow="AI-powered code analysis" title="Review your code" />
      <section className="content">
        <section className="editor-card">
          <div className="editor-heading">
            <div>
              <h3>Code editor</h3>
              <p className="muted small">Paste code, choose the language, and submit it for analysis.</p>
            </div>
            <select value={language} onChange={(e) => { setLanguage(e.target.value); setReview(null) }} aria-label="Programming language">
              {LANGUAGE_NAMES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="editor">
            <div className="editor-top">
              <div className="window-dots"><i /><i /><i /></div>
              <span>main.{extensionFor(language)}</span>
              <span>{lineCount} lines</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => edit(e.target.value)}
              style={{ fontSize: prefs.editorFontSize }}
              placeholder={'// Paste your code here...\n\nfunction example() {\n  // Your code goes here\n}'}
              spellCheck="false"
              aria-label="Code to review"
            />
          </div>
          <div className="code-stats">
            <span>{lineCount} lines</span>
            <span className={tooLong ? 'over' : ''}>{code.length.toLocaleString()} / {MAX_CODE_CHARS.toLocaleString()} characters</span>
          </div>
          {tooLong && <ErrorBanner message={`Code is over the ${MAX_CODE_CHARS.toLocaleString()} character limit. Trim it or review it in parts.`} />}
          <ErrorBanner message={error} onRetry={canSubmit ? submit : undefined} />
          <div className="editor-footer">
            <span className="muted small">Your code is sent to the AI provider for analysis and saved to your history.</span>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={() => downloadText(code, `code.${extensionFor(language)}`)} disabled={!code.trim()}>Download</button>
              <button className="btn btn-ghost" onClick={copy} disabled={!code.trim()}>Copy</button>
              <button className="btn btn-ghost" onClick={() => { edit(''); }} disabled={!code}>Clear</button>
              <button className="btn btn-primary" onClick={submit} disabled={!canSubmit}>
                {busy ? <><span className="spinner spinner-sm" /> Analyzing…</> : '✦ Review code'}
              </button>
            </div>
          </div>
        </section>

        {busy && <p className="muted center-text">The AI is reading your code. This usually takes 10–40 seconds.</p>}

        {review && (
          <div ref={resultRef} className="result-wrap">
            <div className="panel-head">
              <h2>Review results</h2>
              <Link className="btn btn-ghost btn-sm" to={`/history/${review._id}`}>Open saved review</Link>
            </div>
            <ReviewResult review={review} />
          </div>
        )}
      </section>
    </>
  )
}
