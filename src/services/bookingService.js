import { pool } from '#src/db.js'
import { NotFoundError, ConflictError, BadRequestError } from '#src/utils/errors.js'

export async function createBooking ({ eventId, customerId, quantity }) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // decrement seats using a single query to avoid race conditions
    const updateRes = await client.query(
      `UPDATE events
       SET seats_remaining = seats_remaining - $1
       WHERE id = $2 AND seats_remaining >= $1 AND status = 'on_sale'
       RETURNING seats_remaining`,
      [quantity, eventId]
    )

    // if no rows were updated, it means not enough seats or event is cancelled
    if (updateRes.rowCount === 0) {
      await client.query('ROLLBACK')
      throw new ConflictError('Not enough seats available or event is cancelled')
    }

    // insert booking
    const insertRes = await client.query(
      `INSERT INTO bookings (event_id, customer_id, quantity)
       VALUES ($1, $2, $3) RETURNING *`,
      [eventId, customerId, quantity]
    )

    await client.query('COMMIT')
    return insertRes.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')

    // Gestion des erreurs de clés étrangères (Foreign Key)
    if (err.code === '23503') {
      if (err.constraint === 'bookings_event_id_fkey') {
        throw new NotFoundError('Event not found') // 404
      }
      if (err.constraint === 'bookings_customer_id_fkey') {
        throw new BadRequestError('Unknown customer') // 400
      }
    }

    throw err
  } finally {
    client.release()
  }
}

export async function cancelBooking (bookingId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const updateRes = await client.query(
      `UPDATE bookings
       SET status = 'cancelled'
       WHERE id = $1 AND status = 'confirmed'
       RETURNING event_id, quantity`,
      [bookingId]
    )

    if (updateRes.rowCount === 0) {
      // If 0 rows updated, check if it's because it doesn't exist OR cancelled
      const checkRes = await client.query('SELECT status FROM bookings WHERE id = $1', [bookingId])

      if (checkRes.rowCount === 0) {
        throw new NotFoundError('Booking not found') // 404
      } else {
        throw new ConflictError('Booking already cancelled') // 409
      }
    }

    const { event_id: eventId, quantity } = updateRes.rows[0]

    await client.query('UPDATE events SET seats_remaining = seats_remaining + $1 WHERE id = $2', [quantity, eventId])

    await client.query('COMMIT')
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getBookingById (id) {
  const result = await pool.query('SELECT * FROM bookings WHERE id = $1', [id])
  return result.rows[0] ?? null
}

export async function listBookingsForEvent (eventId, { after, limit }) {
  const result = await pool.query(
    `SELECT * FROM bookings
     WHERE event_id = $1 AND ($2::int IS NULL OR id < $2)
     ORDER BY id DESC
     LIMIT $3`,
    [eventId, after || null, limit + 1]
  )

  const hasMore = result.rows.length > limit
  const data = hasMore ? result.rows.slice(0, limit) : result.rows
  const nextCursor = hasMore ? data[data.length - 1].id : null

  return { data, next_cursor: nextCursor }
}
