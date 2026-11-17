import { pool } from '#src/db.js'

export async function createEvent ({ name, venue, startsAt, capacity }) {
  const result = await pool.query(
    `INSERT INTO events (name, venue, starts_at, capacity, seats_remaining)
     VALUES ($1, $2, $3, $4, $4)
     RETURNING *`,
    [name, venue, startsAt, capacity]
  )
  return result.rows[0]
}

export async function getEventById (id) {
  const result = await pool.query('SELECT * FROM events WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function listEvents ({ after, limit }) {
  const result = await pool.query(
    `SELECT * FROM events
     WHERE ($1::int IS NULL OR id < $1)
     ORDER BY id DESC
     LIMIT $2`,
    [after || null, limit + 1]
  )

  const hasMore = result.rows.length > limit
  const data = hasMore ? result.rows.slice(0, limit) : result.rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, next_cursor: nextCursor }
}
