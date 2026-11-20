export class HttpError extends Error {
  constructor (status, code, message) {
    super(message)
    this.name = this.constructor.name
    this.status = status
    this.code = code
  }
}

export class BadRequestError extends HttpError {
  constructor (message = 'Bad request') {
    super(400, 'bad_request', message)
  }
}

export class NotFoundError extends HttpError {
  constructor (message = 'Not found') {
    super(404, 'not_found', message)
  }
}

export class ConflictError extends HttpError {
  constructor (message = 'Conflict') {
    super(409, 'conflict', message)
  }
}
