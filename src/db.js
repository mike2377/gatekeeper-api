import pg from 'pg'
import { config } from './config.js'

const url = new URL(config.databaseUrl)

url.searchParams.delete('channel_binding')

// SSL is required by Neon but not supported by local Postgres
const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname === 'db' || !url.hostname.includes('.')

export const pool = new pg.Pool({
  connectionString: url.toString(),
  ssl: isLocal ? false : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30_000
})

pool.on('error', (err) => {
  console.error('Unexpected database error:', err)
})
