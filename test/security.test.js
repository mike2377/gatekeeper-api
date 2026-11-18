import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '#src/app.js'
import { initTestDb, resetTestDb, closeTestDb } from './setup.js'
import { pool } from '#src/db.js'

const app = createApp()

before(async () => {
  await initTestDb()
})
beforeEach(async () => {
  await resetTestDb()
})
after(async () => {
  await closeTestDb()
})

test('SQL injection in event name is treated as literal string', async () => {
  const payload = "Concert'); DROP TABLE events;--"

  const res = await request(app).post('/events').send({
    name: payload,
    venue: 'Yaounde Expo',
    starts_at: '2026-12-01T20:00:00Z',
    capacity: 100
  })

  assert.equal(res.status, 201)
  assert.equal(res.body.name, payload)

  // Verify tables still exist
  const check = await pool.query('SELECT COUNT(*) FROM events')
  assert.ok(Number(check.rows[0].count) > 0)
})
