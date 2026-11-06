import { z } from 'zod'

const line = z.number().int().min(1).nullable().optional()

export const aiReviewSchema = z.object({
  summary: z.string().min(1),
  score: z.number().min(0).max(100),
  issues: z.array(
    z.object({
      severity: z.enum(['critical', 'warning', 'info']),
      category: z.enum(['bug', 'security', 'performance', 'quality', 'best-practice', 'readability']),
      title: z.string().min(1),
      explanation: z.string().min(1),
      startLine: line,
      endLine: line,
      codeSnippet: z.string().optional().default(''),
      suggestedFix: z.string().optional().default(''),
    })
  ),
  suggestions: z.array(z.object({ title: z.string().min(1), description: z.string().min(1) })),
  complexity: z
    .object({
      time: z.string().optional().default(''),
      space: z.string().optional().default(''),
      notes: z.string().optional().default(''),
    })
    .optional()
    .default({ time: '', space: '', notes: '' }),
  improvedCode: z.string().optional().default(''),
})
