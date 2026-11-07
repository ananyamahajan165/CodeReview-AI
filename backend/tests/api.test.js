import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import request from 'supertest'

process.env.NODE_ENV = 'test'
const base = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017'
process.env.MONGODB_URI = `${base}/codereview-test-${Date.now()}`

const { app } = await import('../app.js')
const { connectDB } = await import('../config/db.js')
const { __setProviderForTests } = await import('../services/ai/index.js')
const { User } = await import('../models/User.js')
const { Review } = await import('../models/Review.js')

const goodAi = (over = {}) => JSON.stringify({
  summary: 'Works but has a bug.', score: 72.4,
  issues: [
    { severity: 'critical', category: 'bug', title: 'Off by one', explanation: 'Loop overruns.', startLine: 2, endLine: 3, codeSnippet: 'i<=n', suggestedFix: 'i<n' },
    { severity: 'warning', category: 'security', title: 'eval used', explanation: 'Dangerous.', startLine: 999, endLine: 1000 },
  ],
  suggestions: [{ title: 'Add tests', description: 'Cover edge cases.' }],
  complexity: { time: 'O(n)', space: 'O(1)', notes: '' },
  improvedCode: 'for (let i=0;i<n;i++){}', ...over,
})

const user = { name: 'Ada Lovelace', email: 'ada@example.com', password: 'Passw0rdOK' }
const code = 'function f(n){\n for(let i=0;i<=n;i++){}\n}'
let token

async function registerAndLogin(u = user) {
  const r = await request(app).post('/api/auth/register').send(u)
  return r.body.token
}

before(async () => { await connectDB() })
after(async () => { await mongoose.connection.dropDatabase(); await mongoose.disconnect() })
beforeEach(async () => {
  await Promise.all([User.deleteMany({}), Review.deleteMany({})])
  __setProviderForTests(async () => goodAi())
  token = await registerAndLogin()
})
const auth = (t = token) => ({ Authorization: `Bearer ${t}` })
const review = (body = {}, t = token) =>
  request(app).post('/api/reviews').set(auth(t)).send({ programmingLanguage: 'JavaScript', code, ...body })

test('health + unknown route 404', async () => {
  assert.equal((await request(app).get('/api/health')).status, 200)
  assert.equal((await request(app).get('/api/nope')).status, 404)
})

test('register stores a bcrypt hash, never the plaintext, and never returns it', async () => {
  const r = await request(app).post('/api/auth/register').send({ ...user, email: 'new@example.com' })
  assert.equal(r.status, 201)
  assert.ok(r.body.token)
  assert.equal(JSON.stringify(r.body).includes('passwordHash'), false)
  assert.equal(JSON.stringify(r.body).includes(user.password), false)
  const stored = await User.findOne({ email: 'new@example.com' }).select('+passwordHash')
  assert.match(stored.passwordHash, /^\$2[aby]\$12\$/)
  assert.notEqual(stored.passwordHash, user.password)
})

test('register validation + duplicate email', async () => {
  assert.equal((await request(app).post('/api/auth/register').send({ ...user, email: 'x@y.com', password: 'short' })).status, 400)
  assert.equal((await request(app).post('/api/auth/register').send({ ...user, email: 'x@y.com', password: 'allletters' })).status, 400)
  assert.equal((await request(app).post('/api/auth/register').send({ ...user, email: 'not-an-email' })).status, 400)
  assert.equal((await request(app).post('/api/auth/register').send(user)).status, 409)
  // case-insensitive duplicate
  assert.equal((await request(app).post('/api/auth/register').send({ ...user, email: 'ADA@example.com' })).status, 409)
})

test('login success, wrong password, unknown email', async () => {
  const ok = await request(app).post('/api/auth/login').send({ email: user.email, password: user.password })
  assert.equal(ok.status, 200); assert.ok(ok.body.token)
  const bad = await request(app).post('/api/auth/login').send({ email: user.email, password: 'wrongpass1' })
  const none = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'wrongpass1' })
  assert.equal(bad.status, 401); assert.equal(none.status, 401)
  assert.equal(bad.body.message, none.body.message) // no user enumeration
})

test('protected routes reject missing/invalid tokens; /me works', async () => {
  for (const [m, p] of [['get', '/api/auth/me'], ['get', '/api/reviews'], ['post', '/api/reviews'], ['get', '/api/dashboard/stats'], ['get', '/api/users/profile']])
    assert.equal((await request(app)[m](p)).status, 401, `${m} ${p}`)
  assert.equal((await request(app).get('/api/auth/me').set({ Authorization: 'Bearer garbage' })).status, 401)
  const me = await request(app).get('/api/auth/me').set(auth())
  assert.equal(me.status, 200); assert.equal(me.body.user.email, user.email)
})

test('create review: stores AI result tied to user, clamps bad line numbers, counts', async () => {
  const r = await review()
  assert.equal(r.status, 201)
  const rv = r.body.review
  assert.equal(rv.score, 72)
  assert.equal(rv.issues.length, 2)
  assert.equal(rv.issues[0].startLine, 2)
  assert.equal(rv.issues[1].startLine, null) // line 999 doesn't exist in 3-line code
  assert.equal(rv.bugCount, 1); assert.equal(rv.criticalCount, 1); assert.equal(rv.warningCount, 1)
  const stored = await Review.findById(rv._id)
  assert.equal(String(stored.userId), String((await User.findOne({ email: user.email }))._id))
  assert.equal(stored.submittedCode, code)
})

test('AI provider failure => error response and NOTHING saved', async () => {
  __setProviderForTests(async () => { const { AppError } = await import('../utils/AppError.js'); throw new AppError('The AI service timed out. Please try again.', 504) })
  const r = await review()
  assert.equal(r.status, 504)
  assert.equal(await Review.countDocuments(), 0)
})

test('invalid / non-JSON / wrong-shape AI output => 502 and nothing saved', async () => {
  for (const bad of ['I am sorry, I cannot do that', '{"summary":"x"}', JSON.stringify({ ...JSON.parse(goodAi()), score: 500 }), '']) {
    __setProviderForTests(async () => bad)
    const r = await review()
    assert.equal(r.status, 502, `output: ${bad.slice(0, 30)}`)
  }
  assert.equal(await Review.countDocuments(), 0)
})

test('AI output wrapped in markdown fences is still parsed', async () => {
  __setProviderForTests(async () => '```json\n' + goodAi() + '\n```')
  assert.equal((await review()).status, 201)
})

test('review input validation', async () => {
  assert.equal((await review({ code: '' })).status, 400)
  assert.equal((await review({ code: 'ab' })).status, 400)
  assert.equal((await review({ programmingLanguage: 'Brainfuck' })).status, 400)
  assert.equal((await review({ code: 'x'.repeat(20001) })).status, 400)
})

test('AI not configured => 503 with clear message (no override)', async () => {
  __setProviderForTests(null)
  const r = await review()
  assert.equal(r.status, 503)
  assert.match(r.body.message, /not configured/i)
})

test('history: list, search, language filter, sort, pagination, light payload', async () => {
  await review({ programmingLanguage: 'JavaScript' })
  __setProviderForTests(async () => goodAi({ summary: 'Python snake case', score: 90, issues: [] }))
  await review({ programmingLanguage: 'Python', code: 'def foo():\n  return 1' })
  const all = await request(app).get('/api/reviews').set(auth())
  assert.equal(all.body.total, 2)
  assert.equal(all.body.reviews[0].programmingLanguage, 'Python') // newest first
  assert.equal('submittedCode' in all.body.reviews[0], false)
  const py = await request(app).get('/api/reviews?language=Python').set(auth())
  assert.equal(py.body.total, 1)
  const found = await request(app).get('/api/reviews?search=snake').set(auth())
  assert.equal(found.body.total, 1)
  const inCode = await request(app).get('/api/reviews?search=def foo').set(auth())
  assert.equal(inCode.body.total, 1)
  const oldest = await request(app).get('/api/reviews?sort=oldest').set(auth())
  assert.equal(oldest.body.reviews[0].programmingLanguage, 'JavaScript')
  const byScore = await request(app).get('/api/reviews?sort=score-high').set(auth())
  assert.equal(byScore.body.reviews[0].score, 90)
  const paged = await request(app).get('/api/reviews?limit=1&page=2').set(auth())
  assert.equal(paged.body.reviews.length, 1); assert.equal(paged.body.pages, 2)
  // regex injection in search is escaped, not executed
  assert.equal((await request(app).get('/api/reviews?search=(').set(auth())).status, 200)
  assert.equal((await request(app).get('/api/reviews?sort=bogus').set(auth())).status, 400)
})

test('details + delete; users cannot see or delete each other\'s reviews', async () => {
  const id = (await review()).body.review._id
  const other = await registerAndLogin({ name: 'Bob Other', email: 'bob@example.com', password: 'Passw0rdOK' })
  assert.equal((await request(app).get(`/api/reviews/${id}`).set(auth(other))).status, 404)
  assert.equal((await request(app).delete(`/api/reviews/${id}`).set(auth(other))).status, 404)
  assert.equal((await request(app).get('/api/reviews').set(auth(other))).body.total, 0)
  const mine = await request(app).get(`/api/reviews/${id}`).set(auth())
  assert.equal(mine.status, 200); assert.equal(mine.body.review.submittedCode, code)
  assert.equal((await request(app).get('/api/reviews/not-an-id').set(auth())).status, 400)
  assert.equal((await request(app).delete(`/api/reviews/${id}`).set(auth())).status, 200)
  assert.equal((await request(app).get(`/api/reviews/${id}`).set(auth())).status, 404)
})

test('dashboard stats come from the database', async () => {
  const empty = await request(app).get('/api/dashboard/stats').set(auth())
  assert.equal(empty.body.stats.totalReviews, 0); assert.equal(empty.body.stats.activity.length, 14)
  await review(); await review({ programmingLanguage: 'Python' })
  const s = (await request(app).get('/api/dashboard/stats').set(auth())).body.stats
  assert.equal(s.totalReviews, 2); assert.equal(s.totalBugs, 2); assert.equal(s.criticalIssues, 2)
  assert.equal(s.averageScore, 72)
  assert.equal(s.languages.length, 2)
  assert.equal(s.recentReviews.length, 2)
  assert.equal(s.activity.at(-1).count, 2)
})

test('profile get/update, email conflict, password change', async () => {
  await registerAndLogin({ name: 'Bob Other', email: 'bob@example.com', password: 'Passw0rdOK' })
  const p = await request(app).get('/api/users/profile').set(auth())
  assert.equal(p.body.user.reviewCount, 0)
  const up = await request(app).put('/api/users/profile').set(auth()).send({ name: 'Ada L.' })
  assert.equal(up.body.user.name, 'Ada L.')
  assert.equal((await request(app).put('/api/users/profile').set(auth()).send({ email: 'bob@example.com' })).status, 409)
  assert.equal((await request(app).put('/api/users/profile').set(auth()).send({ newPassword: 'Another1pass' })).status, 400)
  assert.equal((await request(app).put('/api/users/profile').set(auth()).send({ currentPassword: 'nope', newPassword: 'Another1pass' })).status, 400)
  assert.equal((await request(app).put('/api/users/profile').set(auth()).send({ currentPassword: user.password, newPassword: 'Another1pass' })).status, 200)
  assert.equal((await request(app).post('/api/auth/login').send({ email: user.email, password: 'Another1pass' })).status, 200)
  assert.equal((await request(app).post('/api/auth/login').send({ email: user.email, password: user.password })).status, 401)
})

test('malformed JSON => 400 (no stack leak)', async () => {
  const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad')
  assert.equal(r.status, 400); assert.equal(JSON.stringify(r.body).includes('at '), false)
})
