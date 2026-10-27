
import { useState } from 'react'
import './App.css'

function App() {
  const [code, setCode] = useState('')
  const [language, setLanguage] = useState('JavaScript')
  const [review, setReview] = useState(false)
  const lineCount = code.trim() === '' ? 0 : code.split('\n').length
  const characterCount = code.length
  function handleReview() {
    if (!code.trim()) {
      alert('Please paste your code first.')
      return
    }

    setReview(true)
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2><span className="brand-icon">✳</span> CodeReview AI</h2>

        <button className="new-review" onClick={() => {
          setCode('')
          setReview(false)
        }}>
          + New Review
        </button>

        <p className="nav-label">WORKSPACE</p>
        <div className="nav-item active">⌘ &nbsp; Code Review</div>
        <div className="nav-item">◷ &nbsp; Review History</div>
        <div className="nav-item">⚙ &nbsp; Settings</div>

        <div className="sidebar-bottom">
          <div className="avatar">A</div>
          <div>
            <strong>Developer</strong>
            <p>Free workspace</p>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <span>Workspace / <strong>Code Review</strong></span>
          <span className="status"><i /> All systems ready</span>
        </header>

        <section className="content">
          <div className="eyebrow">AI-POWERED CODE ANALYSIS</div>
          <h1>Write better code.<br /><span>Ship with confidence.</span></h1>
          <p className="subtitle">
            Find bugs, identify security risks, and improve your code
            with your AI coding assistant.
          </p>

          <div className="stats">
            <div className="stat-card">
              <span>REVIEW ENGINE</span>
              <strong>AI Assisted</strong>
              <small>Intelligent analysis</small>
            </div>
            <div className="stat-card">
              <span>LANGUAGES</span>
              <strong>Multiple</strong>
              <small>Choose your language</small>
            </div>
            <div className="stat-card">
              <span>YOUR WORKSPACE</span>
              <strong>Ready to review</strong>
              <small>Paste code to begin</small>
            </div>
          </div>

          <section className="editor-card">
            <div className="editor-heading">
              <div>
                <h3>Code Editor</h3>
                <p>Paste your code below to start an analysis.</p>
              </div>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option>JavaScript</option>
                <option>Python</option>
                <option>Java</option>
                <option>C++</option>
                <option>TypeScript</option>
              </select>
            </div>

            <div className="editor">
              <div className="editor-top">
                <div className="window-dots"><i /><i /><i /></div>
                <span>main.{language === 'Python' ? 'py' : language === 'Java' ? 'java' : language === 'C++' ? 'cpp' : language === 'TypeScript' ? 'ts' : 'js'}</span>
                <span>{lineCount} lines</span>
              </div>
              <textarea
                value={code}
                onChange={(e) => {
                  setCode(e.target.value)
                  setReview(false)
                }}
                placeholder={'// Paste your code here...\n\nfunction example() {\n  // Your code goes here\n}'}
                spellCheck="false"
              />
            </div>
            <div className="code-stats">
            <span>{lineCount} lines</span>
            <span>{characterCount} characters</span>
            </div>
            <div className="editor-footer">
              <span>⌘ Secure workspace · Code stays in this demo</span>
              <button
              className="clear-button"
              onClick={() => {
              setCode('')
              setReview(false)
            }}
          >
          Clear Code
          </button>
              <button onClick={handleReview}>✦ Review Code <span>→</span></button>
            </div>
          </section>

          {review && (
            <section className="result-card">
              <div className="result-heading">
                <h3>Review Summary</h3>
                <span className="demo-tag">DEMO RESULT</span>
              </div>
              <p>Your {language} code has been submitted to the demo review interface.</p>
              <div className="result-note">
                <strong>Next step</strong>
                <p>Real AI analysis will be connected through a secure backend API in a later step. This demo does not analyse code yet.</p>
              </div>
              <button className="secondary-button" onClick={() => setReview(false)}>Edit code</button>
            </section>
          )}
        </section>
      </main>
    </div>
  )
}

export default App
