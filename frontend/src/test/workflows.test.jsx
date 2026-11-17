import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { apiError, renderApp, sampleReview } from './helpers'

vi.mock('../services', () => ({
  authService: { login: vi.fn(), register: vi.fn(), me: vi.fn() },
  reviewService: { create: vi.fn(), list: vi.fn(), get: vi.fn(), remove: vi.fn() },
  dashboardService: { stats: vi.fn() },
  userService: { profile: vi.fn(), update: vi.fn() },
}))
const { authService, reviewService, dashboardService } = await import('../services')

const user = { id: 'u1', name: 'Ada Lovelace', email: 'ada@example.com', createdAt: '2026-01-01T00:00:00Z' }
const signIn = () => { localStorage.setItem('codereview_token', 'tok'); authService.me.mockResolvedValue(user) }

beforeEach(() => vi.clearAllMocks())

describe('route protection', () => {
  it('redirects signed-out visitors from protected pages to login', async () => {
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
  })
  it('restores a session from a stored token', async () => {
    signIn()
    dashboardService.stats.mockResolvedValue({ totalReviews: 0, totalBugs: 0, criticalIssues: 0, averageScore: 0, languages: [], activity: [], recentReviews: [] })
    renderApp('/dashboard')
    expect(await screen.findByRole('heading', { name: /hello, ada/i })).toBeInTheDocument()
    expect(await screen.findByText(/no reviews yet/i)).toBeInTheDocument()
  })
  it('clears an invalid stored token and sends the user to login', async () => {
    localStorage.setItem('codereview_token', 'bad')
    authService.me.mockRejectedValue(apiError(401, 'Invalid or expired token'))
    renderApp('/review')
    expect(await screen.findByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(localStorage.getItem('codereview_token')).toBeNull()
  })
  it('shows the 404 page for unknown routes', async () => {
    renderApp('/nope')
    expect(await screen.findByText(/page not found/i)).toBeInTheDocument()
  })
})

describe('login', () => {
  it('signs in, stores the token and lands on the dashboard', async () => {
    authService.login.mockResolvedValue({ token: 'jwt-1', user })
    dashboardService.stats.mockResolvedValue({ totalReviews: 3, totalBugs: 2, criticalIssues: 1, averageScore: 77, languages: [{ language: 'Python', count: 3, averageScore: 77 }], activity: Array.from({ length: 14 }, (_, i) => ({ date: `2026-10-${String(i + 10)}`, count: 0 })), recentReviews: [] })
    renderApp('/login')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'Passw0rdOK')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('heading', { name: /hello, ada/i })).toBeInTheDocument()
    expect(localStorage.getItem('codereview_token')).toBe('jwt-1')
    expect(await screen.findByText('77')).toBeInTheDocument() // real stats rendered
  })
  it('shows the server error and stays on the page when credentials are wrong', async () => {
    authService.login.mockRejectedValue(apiError(401, 'Invalid email or password'))
    renderApp('/login')
    await userEvent.type(screen.getByLabelText(/email/i), 'ada@example.com')
    await userEvent.type(screen.getByLabelText(/password/i), 'nope')
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(localStorage.getItem('codereview_token')).toBeNull()
  })
  it('register blocks weak/mismatched passwords before calling the API', async () => {
    renderApp('/register')
    await userEvent.type(screen.getByLabelText('Name'), 'Ada')
    await userEvent.type(screen.getByLabelText('Email'), 'ada@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'short')
    await userEvent.type(screen.getByLabelText(/confirm/i), 'different')
    expect(screen.getByRole('button', { name: /create account/i })).toBeDisabled()
    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    expect(authService.register).not.toHaveBeenCalled()
  })
})

describe('code review page', () => {
  beforeEach(signIn)
  const paste = async (text = 'function f() { return 1 }') => {
    renderApp('/review')
    const box = await screen.findByLabelText(/code to review/i)
    await userEvent.click(box)
    await userEvent.paste(text)
  }

  it('disables submit until there is code', async () => {
    renderApp('/review')
    expect(await screen.findByRole('button', { name: /review code/i })).toBeDisabled()
  })
  it('shows live line and character counts', async () => {
    await paste('a\nb\nc')
    expect(screen.getAllByText(/3 lines/).length).toBeGreaterThan(0)
    expect(screen.getByText(/5 \/ 20,000 characters/)).toBeInTheDocument()
  })
  it('submits the language + code and renders the real result', async () => {
    reviewService.create.mockResolvedValue(sampleReview)
    await paste()
    await userEvent.selectOptions(screen.getByLabelText(/programming language/i), 'Python')
    await userEvent.click(screen.getByRole('button', { name: /review code/i }))
    expect(await screen.findByText('Off by one')).toBeInTheDocument()
    expect(screen.getByText('Mostly fine.')).toBeInTheDocument()
    expect(screen.getByLabelText(/quality score 81/i)).toBeInTheDocument()
    expect(reviewService.create).toHaveBeenCalledWith({ programmingLanguage: 'Python', code: 'function f() { return 1 }' })
  })
  it('on AI/API failure shows the error and NO result', async () => {
    reviewService.create.mockRejectedValue(apiError(502, 'The AI returned an invalid response. No review was saved — please try again.'))
    await paste()
    await userEvent.click(screen.getByRole('button', { name: /review code/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/invalid response/i)
    expect(screen.queryByText(/review results/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/quality score/i)).not.toBeInTheDocument()
  })
  it('network failure gives a clear message', async () => {
    reviewService.create.mockRejectedValue(new Error('Network Error'))
    await paste()
    await userEvent.click(screen.getByRole('button', { name: /review code/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot reach the server/i)
  })
  it('clear empties the editor and hides any result', async () => {
    await paste()
    await userEvent.click(screen.getByRole('button', { name: /clear/i }))
    expect(screen.getByLabelText(/code to review/i)).toHaveValue('')
  })
})

describe('history', () => {
  beforeEach(signIn)
  it('lists reviews, filters via the API and deletes after confirmation', async () => {
    reviewService.list.mockResolvedValue({ reviews: [sampleReview], total: 1, page: 1, pages: 1 })
    reviewService.remove.mockResolvedValue({})
    renderApp('/history')
    expect(await screen.findByText('Mostly fine.')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText(/filter by language/i), 'Python')
    await waitFor(() => expect(reviewService.list).toHaveBeenLastCalledWith(expect.objectContaining({ language: 'Python' })))

    await userEvent.click(screen.getByRole('button', { name: /delete javascript review/i }))
    const dialog = await screen.findByRole('dialog')
    expect(reviewService.remove).not.toHaveBeenCalled() // needs confirmation
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    await waitFor(() => expect(reviewService.remove).toHaveBeenCalledWith('r1'))
  })
  it('shows an error with retry when the API fails', async () => {
    reviewService.list.mockRejectedValue(apiError(500, 'Internal server error'))
    renderApp('/history')
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error')
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })
})

describe('review details', () => {
  beforeEach(signIn)
  it('shows original code with the flagged line highlighted', async () => {
    reviewService.get.mockResolvedValue(sampleReview)
    renderApp('/history/r1')
    expect(await screen.findByText('Submitted code')).toBeInTheDocument()
    const flagged = document.querySelector('.cl-hl')
    expect(flagged).toHaveAttribute('data-line', '2')
    expect(screen.getByText('fixed()')).toBeInTheDocument() // improved code
  })
  it('shows not-found for a missing review', async () => {
    reviewService.get.mockRejectedValue(apiError(404, 'Review not found'))
    renderApp('/history/zzz')
    expect(await screen.findByText(/review not found/i)).toBeInTheDocument()
  })
})
