import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../context/AuthContext'
import { ToastProvider } from '../context/ToastContext'
import App from '../App'

export function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <ToastProvider><AuthProvider><App /></AuthProvider></ToastProvider>
    </MemoryRouter>
  )
}

export const sampleReview = {
  _id: 'r1', programmingLanguage: 'JavaScript', submittedCode: 'a\nb\nc', reviewSummary: 'Mostly fine.', score: 81,
  createdAt: '2026-11-01T10:00:00Z', criticalCount: 1, warningCount: 0, bugCount: 1,
  issues: [{ severity: 'critical', category: 'bug', title: 'Off by one', explanation: 'Loop overruns.', startLine: 2, endLine: 2, codeSnippet: 'i<=n', suggestedFix: 'i<n' }],
  suggestions: [{ title: 'Add tests', description: 'Cover edges.' }],
  complexity: { time: 'O(n)', space: 'O(1)', notes: '' }, improvedCode: 'fixed()',
}
export const apiError = (status, message) => Object.assign(new Error(message), { response: { status, data: { status: 'error', message } } })
