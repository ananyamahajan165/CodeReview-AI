import mongoose from 'mongoose'
import { z } from 'zod'
import { Review } from '../models/Review.js'
import { analyzeCode } from '../services/ai/index.js'
import { AppError } from '../utils/AppError.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { LANGUAGE_NAMES } from '../utils/languages.js'
import { env } from '../config/env.js'

export const createReviewSchema = z.object({
  programmingLanguage: z.enum(LANGUAGE_NAMES, { message: 'Unsupported programming language' }),
  code: z
    .string()
    .refine((c) => c.trim().length >= 5, 'Please provide a little more code to review')
    .refine((c) => c.length <= env.maxCodeChars, `Code must be at most ${env.maxCodeChars} characters`),
})

export const listReviewsSchema = z.object({
  search: z.string().trim().max(100).optional(),
  language: z.string().trim().max(30).optional(),
  sort: z.enum(['newest', 'oldest', 'score-high', 'score-low']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const SORTS = {
  newest: { createdAt: -1 }, oldest: { createdAt: 1 },
  'score-high': { score: -1, createdAt: -1 }, 'score-low': { score: 1, createdAt: -1 },
}

export const createReview = asyncHandler(async (req, res) => {
  const { programmingLanguage, code } = req.body
  // If the AI call fails this throws and NOTHING is stored or returned as a "result".
  const r = await analyzeCode({ language: programmingLanguage, code })

  const review = await Review.create({
    userId: req.user._id,
    programmingLanguage,
    submittedCode: code,
    reviewSummary: r.summary,
    score: r.score,
    issues: r.issues,
    suggestions: r.suggestions,
    complexity: r.complexity,
    improvedCode: r.improvedCode,
    aiModel: r.model,
    bugCount: r.issues.filter((i) => i.category === 'bug').length,
    criticalCount: r.issues.filter((i) => i.severity === 'critical').length,
    warningCount: r.issues.filter((i) => i.severity === 'warning').length,
  })
  res.status(201).json({ status: 'success', review })
})

export const listReviews = asyncHandler(async (req, res) => {
  const { search, language, sort, page, limit } = req.validatedQuery
  const filter = { userId: req.user._id }
  if (language && language !== 'all') filter.programmingLanguage = language
  if (search) {
    const rx = new RegExp(escapeRegex(search), 'i')
    filter.$or = [{ reviewSummary: rx }, { submittedCode: rx }, { 'issues.title': rx }]
  }
  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .select('-submittedCode -improvedCode -issues -suggestions') // lightweight list payload
      .sort(SORTS[sort]).skip((page - 1) * limit).limit(limit).lean(),
    Review.countDocuments(filter),
  ])
  res.json({ status: 'success', reviews, total, page, pages: Math.max(1, Math.ceil(total / limit)) })
})

const findOwned = async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid review ID', 400)
  // Scoping by userId means another user's review is indistinguishable from a missing one (404).
  const review = await Review.findOne({ _id: req.params.id, userId: req.user._id })
  if (!review) throw new AppError('Review not found', 404)
  return review
}

export const getReview = asyncHandler(async (req, res) => {
  res.json({ status: 'success', review: await findOwned(req) })
})

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await findOwned(req)
  await review.deleteOne()
  res.json({ status: 'success', message: 'Review deleted' })
})
