import { env } from '../../config/env.js'
import { AppError } from '../../utils/AppError.js'
import { SYSTEM_PROMPT, buildUserPrompt } from './prompt.js'
import { aiReviewSchema } from './reviewSchema.js'
import * as providers from './providers.js'

const registry = { anthropic: providers.anthropic, openai: providers.openai }

// Tests (and future providers) can swap the transport without touching callers.
let override = null
export const __setProviderForTests = (fn) => { override = fn }

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
  try { return JSON.parse(cleaned) } catch { /* fall through */ }
  const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}')
  if (start !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)) } catch { /* fall through */ }
  }
  return null
}

export async function analyzeCode({ language, code }) {
  const provider = registry[env.ai.provider]
  if (!override) {
    if (!provider) throw new AppError(`Unsupported AI_PROVIDER "${env.ai.provider}"`, 500)
    if (!env.ai.apiKey) throw new AppError('AI service is not configured on the server (AI_API_KEY missing).', 503)
  }
  const model = env.ai.model || provider?.defaultModel || 'test-model'
  const args = {
    system: SYSTEM_PROMPT,
    user: buildUserPrompt(language, code),
    apiKey: env.ai.apiKey, model, baseUrl: env.ai.baseUrl, timeoutMs: env.ai.timeoutMs,
  }
  const raw = await (override ? override(args) : provider.complete(args))

  const json = typeof raw === 'string' ? extractJson(raw) : raw
  const parsed = aiReviewSchema.safeParse(json)
  if (!parsed.success) {
    console.error('[ai] invalid response shape:', parsed.error?.issues?.slice(0, 3))
    throw new AppError('The AI returned an invalid response. No review was saved — please try again.', 502)
  }
  const r = parsed.data
  // Clamp line numbers to the submitted code so the UI never points outside it
  const lineCount = code.split('\n').length
  r.issues = r.issues.map((i) => {
    const ok = (n) => (Number.isInteger(n) && n >= 1 && n <= lineCount ? n : null)
    const s = ok(i.startLine)
    return { ...i, startLine: s, endLine: s ? ok(i.endLine) ?? s : null }
  })
  return { ...r, score: Math.round(r.score), model }
}
