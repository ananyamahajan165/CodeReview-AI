import mongoose from 'mongoose'

const issueSchema = new mongoose.Schema(
  {
    severity: { type: String, enum: ['critical', 'warning', 'info'], required: true },
    category: {
      type: String,
      enum: ['bug', 'security', 'performance', 'quality', 'best-practice', 'readability'],
      required: true,
    },
    title: { type: String, required: true },
    explanation: { type: String, required: true },
    startLine: { type: Number, default: null },
    endLine: { type: Number, default: null },
    codeSnippet: { type: String, default: '' },
    suggestedFix: { type: String, default: '' },
  },
  { _id: false }
)

const suggestionSchema = new mongoose.Schema(
  { title: { type: String, required: true }, description: { type: String, required: true } },
  { _id: false }
)

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    programmingLanguage: { type: String, required: true },
    submittedCode: { type: String, required: true },
    reviewSummary: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    issues: { type: [issueSchema], default: [] },
    suggestions: { type: [suggestionSchema], default: [] },
    complexity: {
      time: { type: String, default: '' },
      space: { type: String, default: '' },
      notes: { type: String, default: '' },
    },
    improvedCode: { type: String, default: '' },
    // Denormalised counters so dashboard stats are cheap to aggregate
    bugCount: { type: Number, default: 0 },
    criticalCount: { type: Number, default: 0 },
    warningCount: { type: Number, default: 0 },
    aiModel: { type: String, default: '' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

// History list (newest first, optional language filter) and dashboard aggregations
reviewSchema.index({ userId: 1, createdAt: -1 })
reviewSchema.index({ userId: 1, programmingLanguage: 1, createdAt: -1 })

export const Review = mongoose.model('Review', reviewSchema)
