import express from 'express'
import swaggerUi from 'swagger-ui-express'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { parse } from 'yaml'
import { pool } from '#src/db.js'
import { errorHandler } from '#src/middleware/errorHandler.js'
import { eventsRouter } from '#src/routes/events.js'
import { bookingsRouter, eventBookingsRouter } from '#src/routes/bookings.js'

// Load OpenAPI spec
const here = path.dirname(fileURLToPath(import.meta.url))
const openapiPath = path.join(here, '..', 'openapi.yaml')
const openapiSpec = parse(readFileSync(openapiPath, 'utf8'))

export function createApp () {
  const app = express()
  app.use(express.json({ limit: '16kb' }))

  // Health check
  app.get('/health', async (req, res) => {
    try {
      await pool.query('SELECT 1')
      res.json({ status: 'ok', database: 'ok' })
    } catch (err) {
      console.error('DB ERROR:', err)
      res.status(503).json({ status: 'error', database: 'unreachable' })
    }
  })

  // Swagger UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec))

  // routes
  app.use('/events/:id/bookings', eventBookingsRouter)
  app.use('/events', eventsRouter)
  app.use('/bookings', bookingsRouter)

  // Root route
  app.get('/', (req, res) => {
    res.json({ name: 'Gatekeeper API', status: 'running', docs: '/docs' })
  })

  // rout not found
  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' })
  })

  app.use(errorHandler)
  return app
}
