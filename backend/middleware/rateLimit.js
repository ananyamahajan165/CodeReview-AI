import rateLimit from 'express-rate-limit'
import { env } from '../config/env.js'

const make = (windowMs, limit, message, keyGenerator) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.isTest,
    keyGenerator,
    validate: { keyGeneratorIpFallback: false },
    handler: (_req, res) => res.status(429).json({ status: 'error', message }),
  })

// Brute-force protection on login/register (per IP)
export const authLimiter = make(15 * 60 * 1000, 20, 'Too many attempts. Try again in 15 minutes.', (req) => req.ip)
// AI calls cost money: limit per authenticated user
export const reviewLimiter = make(
  60 * 60 * 1000,
  30,
  'Review limit reached (30/hour). Please try again later.',
  (req) => String(req.user?._id || req.ip)
)
export const apiLimiter = make(15 * 60 * 1000, 300, 'Too many requests.', (req) => req.ip)
