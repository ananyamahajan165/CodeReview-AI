import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'

process.env.NODE_ENV = 'test'
const { env } = await import('../config/env.js')
const { analyzeCode, __setProviderForTests } = await import('../services/ai/index.js')

const review = {
  summary: 'ok', score: 88, issues: [], suggestions: [], complexity: { time: 'O(1)', space: 'O(1)', notes: '' }, improvedCode: '',
}
let server, port, mode, lastReq
before(async () => {
  __setProviderForTests(null) // exercise the REAL provider code
  server = http.createServer((req, res) => {
    let body = ''
    req.on('data', (c) => (body += c))
    req.on('end', () => {
      lastReq = { url: req.url, headers: req.headers, body: JSON.parse(body || '{}') }
      if (mode === 'slow') return // never respond -> timeout
      if (mode === 401 || mode === 429 || mode === 500) { res.writeHead(mode); return res.end('{"error":"secret upstream detail"}') }
      res.setHeader('Content-Type', 'application/json')
      if (req.url.endsWith('/v1/messages'))
        return res.end(JSON.stringify({ content: [{ type: 'text', text: mode === 'garbage' ? 'sorry!' : JSON.stringify(review) }] }))
      res.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(review) } }] }))
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  port = server.address().port
})
after(() => server.close())

const setup = (provider, extra = {}) => {
  Object.assign(env.ai, { provider, apiKey: 'test-key', model: '', timeoutMs: 5000, baseUrl: `http://127.0.0.1:${port}${provider === 'openai' ? '/v1' : ''}`, ...extra })
}
const run = () => analyzeCode({ language: 'Python', code: 'print(1)\n' })

test('anthropic: correct request shape, parses response', async () => {
  mode = 'ok'; setup('anthropic')
  const r = await run()
  assert.equal(r.score, 88)
  assert.equal(lastReq.url, '/v1/messages')
  assert.equal(lastReq.headers['x-api-key'], 'test-key')
  assert.ok(lastReq.headers['anthropic-version'])
  assert.match(lastReq.body.messages[0].content, /<code>\nprint\(1\)/)
  assert.ok(lastReq.body.system.includes('DATA'))
})

test('openai-compatible: bearer auth + json mode', async () => {
  mode = 'ok'; setup('openai')
  const r = await run()
  assert.equal(r.score, 88)
  assert.equal(lastReq.headers.authorization, 'Bearer test-key')
  assert.deepEqual(lastReq.body.response_format, { type: 'json_object' })
})

test('upstream errors map to clean, non-leaking errors', async () => {
  setup('anthropic')
  for (const [m, status] of [[401, 502], [429, 503], [500, 502]]) {
    mode = m
    await assert.rejects(run, (e) => { assert.equal(e.statusCode, status); assert.equal(e.message.includes('secret'), false); return true })
  }
})

test('non-JSON model output is rejected (502)', async () => {
  mode = 'garbage'; setup('anthropic')
  await assert.rejects(run, (e) => e.statusCode === 502)
})

test('timeout -> 504', async () => {
  mode = 'slow'; setup('anthropic', { timeoutMs: 300 })
  await assert.rejects(run, (e) => e.statusCode === 504)
})

test('unreachable host -> 502; missing key -> 503; unknown provider -> 500', async () => {
  mode = 'ok'; setup('anthropic', { baseUrl: 'http://127.0.0.1:9' })
  await assert.rejects(run, (e) => e.statusCode === 502)
  setup('anthropic', { apiKey: '' })
  await assert.rejects(run, (e) => e.statusCode === 503)
  setup('nonsense')
  await assert.rejects(run, (e) => e.statusCode === 500)
})
