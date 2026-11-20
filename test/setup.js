import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { pool } from '#src/db.js'

if (process.env.NODE_ENV !== 'test' || !process.env.TEST_DATABASE_URL) {
  throw new Error('Tests require NODE_ENV=test and TEST_DATABASE_URL to be set.')
}

const here = path.dirname(fileURLToPath(import.meta.url))
const schemaPath = path.join(here, '..', 'src', 'db', 'schema.sql')

export async function initTestDb () {
  const sql = await readFile(schemaPath, 'utf8')
  await pool.query(sql)
}

export async function resetTestDb () {
  await pool.query('TRUNCATE bookings, customers, events RESTART IDENTITY CASCADE')
}

export async function closeTestDb () {
  await pool.end()
}
