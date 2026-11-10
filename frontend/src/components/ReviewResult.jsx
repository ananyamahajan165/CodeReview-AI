import { useMemo } from 'react'
import ScoreRing from './ScoreRing'
import CodeBlock from './CodeBlock'
import { downloadText } from '../utils/format'
import { extensionFor } from '../utils/languages'
import { useToast } from '../context/ToastContext'

const GROUPS = [
  { severity: 'critical', title: 'Critical issues' },
  { severity: 'warning', title: 'Warnings' },
  { severity: 'info', title: 'Notes' },
]

function lineLabel(i) {
  if (!i.startLine) return null
  return i.endLine && i.endLine !== i.startLine ? `Lines ${i.startLine}–${i.endLine}` : `Line ${i.startLine}`
}

export default function ReviewResult({ review, showOriginal = false }) {
  const toast = useToast()
  const { issues = [], suggestions = [], complexity } = review
  const highlighted = useMemo(() => {
    const s = new Set()
    issues.forEach((i) => { if (i.startLine) for (let n = i.startLine; n <= (i.endLine || i.startLine); n++) s.add(n) })
    return s
  }, [issues])
  const hasComplexity = complexity && (complexity.time || complexity.space || complexity.notes)

  const copy = async (text) => {
    try { await navigator.clipboard.writeText(text); toast.success('Copied to clipboard') }
    catch { toast.error('Could not copy. Please copy manually.') }
  }

  return (
    <div className="review-result">
      <section className="panel score-panel">
        <ScoreRing score={review.score} />
        <div>
          <h3>Overall quality</h3>
          <p className="muted">{review.reviewSummary}</p>
          <p className="chips">
            <span className="chip chip-critical">{issues.filter((i) => i.severity === 'critical').length} critical</span>
            <span className="chip chip-warning">{issues.filter((i) => i.severity === 'warning').length} warnings</span>
            <span className="chip">{suggestions.length} suggestions</span>
          </p>
        </div>
      </section>

      {issues.length === 0 && <section className="panel"><p className="muted">No issues were reported for this code.</p></section>}

      {GROUPS.map(({ severity, title }) => {
        const items = issues.filter((i) => i.severity === severity)
        if (!items.length) return null
        return (
          <section key={severity} className="panel">
            <h3>{title} <span className="count">{items.length}</span></h3>
            <div className="issue-list">
              {items.map((i, idx) => (
                <article key={idx} className={`issue issue-${i.severity}`}>
                  <header>
                    <strong>{i.title}</strong>
                    <span className="chip">{i.category}</span>
                    {lineLabel(i) && <span className="chip chip-line">{lineLabel(i)}</span>}
                  </header>
                  <p>{i.explanation}</p>
                  {i.codeSnippet && <pre className="snippet"><code>{i.codeSnippet}</code></pre>}
                  {i.suggestedFix && (
                    <div className="fix">
                      <span className="fix-label">Suggested fix</span>
                      <pre className="snippet snippet-fix"><code>{i.suggestedFix}</code></pre>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {hasComplexity && (
        <section className="panel">
          <h3>Complexity</h3>
          <div className="complexity">
            {complexity.time && <div><span className="muted">Time</span><strong>{complexity.time}</strong></div>}
            {complexity.space && <div><span className="muted">Space</span><strong>{complexity.space}</strong></div>}
          </div>
          {complexity.notes && <p className="muted">{complexity.notes}</p>}
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="panel">
          <h3>Suggestions <span className="count">{suggestions.length}</span></h3>
          <ul className="suggestions">
            {suggestions.map((s, i) => <li key={i}><strong>{s.title}</strong><p className="muted">{s.description}</p></li>)}
          </ul>
        </section>
      )}

      {review.improvedCode && (
        <section className="panel">
          <div className="panel-head">
            <h3>Improved code</h3>
            <div className="btn-row">
              <button className="btn btn-ghost btn-sm" onClick={() => copy(review.improvedCode)}>Copy</button>
              <button className="btn btn-ghost btn-sm" onClick={() => downloadText(review.improvedCode, `improved.${extensionFor(review.programmingLanguage)}`)}>Download</button>
            </div>
          </div>
          <CodeBlock code={review.improvedCode} />
        </section>
      )}

      {showOriginal && (
        <section className="panel">
          <div className="panel-head">
            <h3>Submitted code</h3>
            <span className="muted small">Highlighted lines are referenced by an issue</span>
          </div>
          <CodeBlock code={review.submittedCode} highlight={highlighted} />
        </section>
      )}
    </div>
  )
}
