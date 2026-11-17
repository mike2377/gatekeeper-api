import express from 'express'
import { pool } from './db.js'
import { errorHandler } from './middleware/errorHandler.js'

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

  // route
  app.get('/', (req, res) => {
    res.json({ name: 'Gatekeeper API', status: 'running', docs: '/docs' })
  })

  app.use((req, res) => {
    res.status(404).json({ error: 'not_found', message: 'Route not found' })
  })

  app.use(errorHandler)
  return app
}
