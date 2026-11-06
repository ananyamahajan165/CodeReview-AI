import { AppError } from '../../utils/AppError.js'

// Each provider: async complete({ system, user, apiKey, model, baseUrl, timeoutMs }) -> string
async function post(url, { headers, body, timeoutMs }) {
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError')
      throw new AppError('The AI service timed out. Please try again.', 504)
    throw new AppError('Could not reach the AI service.', 502)
  }
  if (!res.ok) {
    // Log upstream detail server-side only; never forward it (may contain account info)
    const text = await res.text().catch(() => '')
    console.error(`[ai] upstream ${res.status}: ${text.slice(0, 300)}`)
    if (res.status === 401 || res.status === 403)
      throw new AppError('AI service rejected the server credentials. Check AI_API_KEY.', 502)
    if (res.status === 429)
      throw new AppError('The AI service is rate limited right now. Please retry shortly.', 503)
    throw new AppError(`The AI service returned an error (${res.status}).`, 502)
  }
  return res.json()
}

export const anthropic = {
  defaultModel: 'claude-sonnet-5-5',
  async complete({ system, user, apiKey, model, baseUrl, timeoutMs }) {
    const data = await post(`${baseUrl || 'https://api.anthropic.com'}/v1/messages`, {
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: { model, max_tokens: 8000, system, messages: [{ role: 'user', content: user }] },
      timeoutMs,
    })
    return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('')
  },
}

// Works with OpenAI, Groq, OpenRouter, Together, Gemini's OpenAI-compatible endpoint, Ollama...
export const openai = {
  defaultModel: 'gpt-4o-mini',
  async complete({ system, user, apiKey, model, baseUrl, timeoutMs }) {
    const data = await post(`${baseUrl || 'https://api.openai.com/v1'}/chat/completions`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      body: {
        model,
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      },
      timeoutMs,
    })
    return data.choices?.[0]?.message?.content || ''
  },
}
