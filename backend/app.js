import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { env } from './config/env.js'
import routes from './routes/index.js'
import { apiLimiter } from './middleware/rateLimit.js'
import { notFound, errorHandler } from './middleware/error.js'

export const app = express()

app.set('trust proxy', 1) // behind Render/Railway proxy: correct client IP for rate limiting
app.use(helmet())
app.use(cors({
  origin: (origin, cb) => (!origin || env.clientUrls.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS'))),
}))
app.use(express.json({ limit: '200kb' }))
if (!env.isTest) app.use(morgan(env.isProd ? 'combined' : 'dev'))

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))
app.use('/api', apiLimiter, routes)
app.use(notFound)
app.use(errorHandler)
