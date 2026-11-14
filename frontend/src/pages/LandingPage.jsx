import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  ['Bugs and logic errors', 'Off-by-one mistakes, unhandled cases, wrong conditions — pointed to by line number.'],
  ['Security review', 'Injection, unsafe eval, leaked secrets and other vulnerabilities, ranked by severity.'],
  ['Performance and complexity', 'Time and space complexity where it can be determined, plus the hot spots worth fixing.'],
  ['Quality and readability', 'Naming, structure and maintainability notes you could raise in a real code review.'],
  ['Corrected code', 'Each finding comes with a suggested fix, and you get a full improved version to compare.'],
  ['A history you own', 'Every review is saved to your account, searchable, filterable and private to you.'],
]

const STEPS = [
  ['Paste your code', 'Pick from 15+ languages. Up to 20,000 characters per review.'],
  ['Get an AI review', 'Your code is analysed by an LLM on our server; no API keys ever reach your browser.'],
  ['Fix and re-check', 'Apply the suggested fixes, then re-run the review straight from your history.'],
]

export default function LandingPage() {
  const { user } = useAuth()
  return (
    <div className="landing">
      <header className="landing-nav">
        <span className="brand"><span className="brand-icon">✳</span> CodeReview AI</span>
        <nav>
          {user ? <Link className="btn btn-primary btn-sm" to="/dashboard">Open dashboard</Link> : (
            <>
              <Link className="btn btn-ghost btn-sm" to="/login">Sign in</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Get started</Link>
            </>
          )}
        </nav>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">AI-powered code review</div>
          <h1>A senior reviewer for every pull request you haven’t opened yet.</h1>
          <p className="subtitle">Paste code, get a scored review with line-level findings, security flags and corrected code. Then keep every review in a searchable history.</p>
          <div className="btn-row">
            <Link className="btn btn-primary btn-lg" to={user ? '/review' : '/register'}>Review my code</Link>
            {!user && <Link className="btn btn-ghost btn-lg" to="/login">I have an account</Link>}
          </div>
        </div>

        <aside className="sample" aria-label="Example of a review">
          <div className="sample-head"><span className="chip">Sample output</span><span className="muted small">illustrative — not a live review</span></div>
          <pre className="codeblock sample-code">
            <div className="cl"><span className="ln">1</span><code>function sum(items) {'{'}</code></div>
            <div className="cl cl-hl"><span className="ln">2</span><code>{'  for (let i = 0; i <= items.length; i++) {'}</code></div>
            <div className="cl"><span className="ln">3</span><code>{'    total += items[i]'}</code></div>
            <div className="cl"><span className="ln">4</span><code>{'  }'}</code></div>
            <div className="cl"><span className="ln">5</span><code>{'}'}</code></div>
          </pre>
          <div className="issue issue-critical">
            <header><strong>Off-by-one in loop bound</strong><span className="chip chip-line">Line 2</span></header>
            <p>The loop reads one element past the end, adding <code>undefined</code> to the total.</p>
          </div>
        </aside>
      </section>

      <section className="landing-section">
        <h2>What gets reviewed</h2>
        <div className="feature-grid">
          {FEATURES.map(([t, d]) => <div key={t} className="feature"><h3>{t}</h3><p className="muted">{d}</p></div>)}
        </div>
      </section>

      <section className="landing-section">
        <h2>How it works</h2>
        <ol className="steps">
          {STEPS.map(([t, d], i) => <li key={t}><span className="step-num">{i + 1}</span><div><h3>{t}</h3><p className="muted">{d}</p></div></li>)}
        </ol>
      </section>

      <section className="cta">
        <h2>Catch the bug before your reviewer does.</h2>
        <Link className="btn btn-primary btn-lg" to={user ? '/review' : '/register'}>{user ? 'New review' : 'Create a free account'}</Link>
      </section>
      <footer className="landing-footer muted small">CodeReview AI · AI findings can be wrong — always verify before shipping.</footer>
    </div>
  )
}
