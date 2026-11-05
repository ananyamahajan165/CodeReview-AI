import { AppError } from '../utils/AppError.js'

// validate(schema, 'body' | 'query') -> replaces req[source] with the parsed value
export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }))
    return next(new AppError('Validation failed', 400, details))
  }
  if (source === 'query') {
    // Express 5 makes req.query read-only; stash parsed values separately
    req.validatedQuery = result.data
  } else {
    req[source] = result.data
  }
  next()
}
