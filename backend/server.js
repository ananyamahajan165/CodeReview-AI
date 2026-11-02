import { app } from './app.js'
import { env } from './config/env.js'
import { connectDB } from './config/db.js'

await connectDB()
console.log('MongoDB connected')
if (!env.ai.apiKey) console.warn('WARNING: AI_API_KEY is not set — review requests will return 503 until it is.')
app.listen(env.port, () => console.log(`API listening on :${env.port} (${env.nodeEnv})`))
