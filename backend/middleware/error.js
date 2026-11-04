import { env } from '../config/env.js'

export const notFound = (req, res) =>
  res.status(404).json({ status: 'error', message: `Route not found: ${req.method} ${req.originalUrl}` })

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, _req, res, _next) => {
  let status = err.statusCode || 500
  let message = err.message
  let details = err.details

  if (err.name === 'CastError') { status = 400; message = 'Invalid ID' }
  else if (err.code === 11000) { status = 409; message = 'A record with that value already exists' }
  else if (err.name === 'ValidationError') { status = 400; message = 'Validation failed'; details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message })) }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body' }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request body too large' }

  if (status >= 500 && !err.isOperational) {
    if (!env.isTest) console.error(err)
    message = 'Internal server error' // never leak internals
    details = undefined
  }
  res.status(status).json({ status: 'error', message, ...(details && { details }) })
}
