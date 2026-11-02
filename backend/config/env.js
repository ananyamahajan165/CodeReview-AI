import 'dotenv/config'

const required = (name) => {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

const isTest = process.env.NODE_ENV === 'test'

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isTest,
  isProd: process.env.NODE_ENV === 'production',
  port: Number(process.env.PORT) || 5000,
  // In tests the DB URI is injected by the test harness
  mongoUri: isTest ? process.env.MONGODB_URI : required('MONGODB_URI'),
  jwtSecret: isTest ? process.env.JWT_SECRET || 'test-secret' : required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxCodeChars: Number(process.env.MAX_CODE_CHARS) || 20000,
  ai: {
    provider: (process.env.AI_PROVIDER || 'anthropic').toLowerCase(),
    apiKey: process.env.AI_API_KEY || '',
    model: process.env.AI_MODEL || '',
    baseUrl: process.env.AI_BASE_URL || '',
    timeoutMs: Number(process.env.AI_TIMEOUT_MS) || 60000,
  },
}

if (env.isProd && env.jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production')
}
