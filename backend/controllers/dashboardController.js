import { Review } from '../models/Review.js'
import { asyncHandler } from '../utils/asyncHandler.js'

const ACTIVITY_DAYS = 14

// Stats are computed from one lean projection (no code bodies, ~100 bytes/doc) instead of
// several $group pipelines. Reviews are rate-limited per user, so this stays cheap, and the
// logic is plain JS that is easy to test. If a user ever has 100k+ reviews, move to $group.
export const getStats = asyncHandler(async (req, res) => {
  const userId = req.user._id
  const rows = await Review.find({ userId })
    .select('programmingLanguage reviewSummary score bugCount criticalCount createdAt')
    .sort({ createdAt: -1 })
    .lean()

  const since = new Date()
  since.setUTCHours(0, 0, 0, 0)
  since.setUTCDate(since.getUTCDate() - (ACTIVITY_DAYS - 1))
  const byDay = {}
  const langs = new Map()
  let totalBugs = 0, criticalIssues = 0, scoreSum = 0

  for (const r of rows) {
    totalBugs += r.bugCount
    criticalIssues += r.criticalCount
    scoreSum += r.score
    const l = langs.get(r.programmingLanguage) || { language: r.programmingLanguage, count: 0, scoreSum: 0 }
    l.count += 1; l.scoreSum += r.score
    langs.set(r.programmingLanguage, l)
    if (r.createdAt >= since) {
      const key = r.createdAt.toISOString().slice(0, 10)
      byDay[key] = (byDay[key] || 0) + 1
    }
  }

  // Fill the window so days with no reviews show as zero
  const activity = Array.from({ length: ACTIVITY_DAYS }, (_, i) => {
    const d = new Date(since)
    d.setUTCDate(since.getUTCDate() + i)
    const date = d.toISOString().slice(0, 10)
    return { date, count: byDay[date] || 0 }
  })

  res.json({
    status: 'success',
    stats: {
      totalReviews: rows.length,
      totalBugs,
      criticalIssues,
      averageScore: rows.length ? Math.round(scoreSum / rows.length) : 0,
      languages: [...langs.values()]
        .sort((a, b) => b.count - a.count)
        .map((l) => ({ language: l.language, count: l.count, averageScore: Math.round(l.scoreSum / l.count) })),
      activity,
      recentReviews: rows.slice(0, 5),
    },
  })
})
