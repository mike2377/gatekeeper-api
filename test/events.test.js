import { test, before, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { createApp } from '#src/app.js'
import { initTestDb, resetTestDb, closeTestDb } from './setup.js'

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

const validEvent = {
  name: 'Concert',
  venue: 'Douala',
  starts_at: '2026-12-01T20:00:00Z',
  capacity: 100
}

test('POST /events creates an event', async () => {
  const res = await request(app).post('/events').send(validEvent)
  assert.equal(res.status, 201)
  assert.equal(res.body.name, 'Concert')
  assert.equal(res.body.capacity, 100)
  assert.equal(res.body.seats_remaining, 100)
})

test('POST /events rejects invalid data', async () => {
  const res = await request(app).post('/events').send({ name: 'A' })
  assert.equal(res.status, 400)
  assert.equal(res.body.error, 'validation_error')
})

test('GET /events/:id returns an event', async () => {
  const createRes = await request(app).post('/events').send(validEvent)
  const res = await request(app).get(`/events/${createRes.body.id}`)
  assert.equal(res.status, 200)
  assert.equal(res.body.id, createRes.body.id)
})

test('GET /events/:id returns 404 for unknown event', async () => {
  const res = await request(app).get('/events/999')
  assert.equal(res.status, 404)
})

test('GET /events returns paginated events', async () => {
  await request(app).post('/events').send(validEvent)
  await request(app).post('/events').send(validEvent)
  await request(app).post('/events').send(validEvent)

  const res = await request(app).get('/events?limit=2')
  assert.equal(res.status, 200)
  assert.equal(res.body.data.length, 2)
  assert.ok(res.body.next_cursor)
})
