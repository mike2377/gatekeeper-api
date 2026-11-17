import { ZodError } from 'zod'
import { HttpError } from '../utils/errors.js'

// eslint-disable-next-line no-unused-vars
export function errorHandler (err, req, res, next) {
  // malformed JSON body
  const isMalformedJson = err.type === 'entity.parse.failed' || (err instanceof SyntaxError && err.status === 400)

  if (isMalformedJson) {
    return res.status(400).json({
      error: 'validation_error',
      message: 'Invalid JSON in request body'
    })
  }

  // Zod Validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'validation_error',
      issues: err.issues.map((issue) => ({
        path: issue.path,
        message: issue.message
      }))
    })
  }

  // custom HTTP errors (400, 404, 409)
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.code,
      message: err.message
    })
  }

  // unhandled errors (500)
  console.error('Unhandled error:', err)
  return res.status(500).json({
    error: 'internal_error',
    message: 'Something went wrong'
  })
}
