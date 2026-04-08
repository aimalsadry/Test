import { Router } from 'express';
import pool from './db.js';
import { sendConfirmationEmail, sendDeclineEmail, sendCancellationEmail } from './email.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/available-slots', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date required' });

    const dateObj = new Date(date + 'T00:00:00');
    const dayOfWeek = dateObj.getDay();

    const ruleResult = await pool.query('SELECT * FROM availability_rules WHERE day_of_week = $1', [dayOfWeek]);
    if (ruleResult.rows.length === 0 || !ruleResult.rows[0].is_working_day) {
      return res.json({ slots: [], closed: true });
    }

    const blockedResult = await pool.query('SELECT * FROM blocked_dates WHERE blocked_date = $1', [date]);
    if (blockedResult.rows.length > 0) {
      return res.json({ slots: [], closed: true, reason: blockedResult.rows[0].reason });
    }

    const settingsResult = await pool.query('SELECT * FROM booking_settings');
    const settings = {};
    settingsResult.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });

    const preventSameDay = settings.prevent_same_day_booking === 'true';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    if (preventSameDay && date === todayStr) {
      return res.json({ slots: [], closed: true, reason: 'Same-day booking not available' });
    }

    const rule = ruleResult.rows[0];
    const duration = 10;
    const buffer = 5;

    const approvedResult = await pool.query(
      "SELECT preferred_time, end_time FROM bookings WHERE preferred_date = $1 AND status = 'approved'",
      [date]
    );

    const bookedSlots = approvedResult.rows.map(r => ({
      start: r.preferred_time,
      end: r.end_time
    }));

    const openMinutes = timeToMinutes(rule.open_time);
    const closeMinutes = timeToMinutes(rule.close_time);
    const lunchStartMinutes = timeToMinutes(rule.lunch_start);
    const lunchEndMinutes = timeToMinutes(rule.lunch_end);

    const seed = dateHash(date);
    const gaps = [30, 60, 90, 120];

    const baseSlots = new Set();
    let cursor = openMinutes;
    let rngState = seed;
    while (cursor + duration <= closeMinutes) {
      if (!(cursor < lunchEndMinutes && cursor + duration > lunchStartMinutes)) {
        baseSlots.add(cursor);
      }
      rngState = lcg(rngState);
      const gap = gaps[rngState % gaps.length];
      cursor += gap;
    }

    const revealedSlots = new Set();
    for (const b of bookedSlots) {
      const revealedMinute = timeToMinutes(b.start) + 30;
      if (revealedMinute + duration <= closeMinutes) {
        revealedSlots.add(revealedMinute);
      }
    }

    const candidateMinutes = new Set([...baseSlots, ...revealedSlots]);

    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const slots = [];
    for (const m of [...candidateMinutes].sort((a, b) => a - b)) {
      const slotEnd = m + duration;

      if (m < lunchEndMinutes && slotEnd > lunchStartMinutes) continue;
      if (m < openMinutes || slotEnd > closeMinutes) continue;

      if (date === todayStr && m <= nowMinutes + 60) continue;

      const conflict = bookedSlots.some(b => {
        const bStart = timeToMinutes(b.start);
        const bEndWithBuffer = timeToMinutes(b.end) + buffer;
        return m < bEndWithBuffer && slotEnd > bStart;
      });
      if (conflict) continue;

      slots.push({ start: minutesToTime(m), end: minutesToTime(slotEnd) });
    }

    res.json({ slots, closed: false });
  } catch (err) {
    console.error('Available slots error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/book', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message, preferredDate, preferredTime, sourcePage } = req.body;

    if (!firstName || !lastName || !email || !phone || !preferredDate || !preferredTime) {
      return res.status(400).json({ error: 'All required fields must be filled' });
    }

    const settingsResult = await pool.query('SELECT * FROM booking_settings');
    const settings = {};
    settingsResult.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    const duration = parseInt(settings.meeting_duration_minutes || '30');

    const endTime = minutesToTime(timeToMinutes(preferredTime) + duration);

    const result = await pool.query(
      `INSERT INTO bookings (first_name, last_name, email, phone, preferred_date, preferred_time, end_time, message, source_page, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
       RETURNING id`,
      [firstName, lastName, email, phone, preferredDate, preferredTime, endTime, message || '', sourcePage || 'unknown']
    );

    res.json({ success: true, bookingId: result.rows[0].id });
  } catch (err) {
    console.error('Booking error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', requireAdmin, async (req, res) => {
  try {
    const { status, date, search } = req.query;
    let query = 'SELECT * FROM bookings';
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`status = $${params.length}`);
    }
    if (date) {
      params.push(date);
      conditions.push(`preferred_date = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(first_name ILIKE $${params.length} OR last_name ILIKE $${params.length} OR phone ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY preferred_date DESC, preferred_time ASC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/today', requireAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = await pool.query(
      "SELECT * FROM bookings WHERE preferred_date = $1 AND status = 'approved' ORDER BY preferred_time ASC",
      [today]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Today bookings error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) as count FROM bookings');
    const approved = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'approved'");
    const pending = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'pending'");
    const declined = await pool.query("SELECT COUNT(*) as count FROM bookings WHERE status = 'declined'");

    const peakHours = await pool.query(
      `SELECT EXTRACT(HOUR FROM preferred_time) as hour, COUNT(*) as count 
       FROM bookings GROUP BY hour ORDER BY count DESC LIMIT 5`
    );

    const totalCount = parseInt(total.rows[0].count);
    const approvedCount = parseInt(approved.rows[0].count);

    res.json({
      total: totalCount,
      approved: approvedCount,
      pending: parseInt(pending.rows[0].count),
      declined: parseInt(declined.rows[0].count),
      approvalRate: totalCount > 0 ? Math.round((approvedCount / totalCount) * 100) : 0,
      peakHours: peakHours.rows
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/approve', requireAdmin, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');

    const booking = await client.query('SELECT * FROM bookings WHERE id = $1 FOR UPDATE', [id]);
    if (booking.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Booking not found' }); }

    const b = booking.rows[0];
    const settingsResult = await client.query("SELECT setting_value FROM booking_settings WHERE setting_key = 'buffer_minutes'");
    const buffer = parseInt(settingsResult.rows[0]?.setting_value || '15');

    const conflictCheck = await client.query(
      `SELECT id FROM bookings 
       WHERE preferred_date = $1 AND status = 'approved' AND id != $2
       AND (
         ($3::time < end_time + ($4 || ' minutes')::interval AND $5::time > preferred_time)
       )`,
      [b.preferred_date, id, b.preferred_time, buffer, b.end_time]
    );

    if (conflictCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Time slot conflict with another approved booking' });
    }

    await client.query(
      "UPDATE bookings SET status = 'approved', updated_at = NOW() WHERE id = $1",
      [id]
    );
    await client.query('COMMIT');

    const updated = { ...b, status: 'approved' };
    sendConfirmationEmail(updated).catch(err => console.error('Email error:', err));

    res.json({ success: true, booking: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Server error' });
  } finally {
    client.release();
  }
});

router.put('/:id/decline', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Decline reason required' });

    await pool.query(
      "UPDATE bookings SET status = 'declined', decline_reason = $1, updated_at = NOW() WHERE id = $2",
      [reason, id]
    );

    const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    sendDeclineEmail(booking.rows[0]).catch(err => console.error('Email error:', err));
    res.json({ success: true, booking: booking.rows[0] });
  } catch (err) {
    console.error('Decline error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/cancel', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Cancellation reason required' });

    const existing = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    if (existing.rows[0].status !== 'approved') return res.status(400).json({ error: 'Only approved bookings can be cancelled' });

    await pool.query(
      "UPDATE bookings SET status = 'cancelled', decline_reason = $1, updated_at = NOW() WHERE id = $2",
      [reason, id]
    );

    const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
    sendCancellationEmail(booking.rows[0]).catch(err => console.error('Email error:', err));
    res.json({ success: true, booking: booking.rows[0] });
  } catch (err) {
    console.error('Cancel error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/tags', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;
    await pool.query('UPDATE bookings SET tags = $1, updated_at = NOW() WHERE id = $2', [tags, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Tags error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/notes', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    await pool.query('UPDATE bookings SET private_notes = $1, updated_at = NOW() WHERE id = $2', [notes, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Notes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/export-csv', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM bookings ORDER BY preferred_date DESC, preferred_time ASC');
    const rows = result.rows;

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Date', 'Time', 'Status', 'Tags', 'Source', 'Message', 'Created'];
    const csvLines = [headers.join(',')];

    rows.forEach(r => {
      const dateStr = r.preferred_date instanceof Date ? r.preferred_date.toISOString().split('T')[0] : r.preferred_date;
      const createdStr = r.created_at instanceof Date ? r.created_at.toISOString() : r.created_at;
      csvLines.push([
        r.id,
        `"${r.first_name}"`,
        `"${r.last_name}"`,
        `"${r.email}"`,
        `"${r.phone}"`,
        dateStr,
        r.preferred_time,
        r.status,
        `"${(r.tags || []).join(';')}"`,
        `"${r.source_page || ''}"`,
        `"${(r.message || '').replace(/"/g, '""')}"`,
        createdStr
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
    res.send(csvLines.join('\n'));
  } catch (err) {
    console.error('Export CSV error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/calendar/:year/:month', requireAdmin, async (req, res) => {
  try {
    const { year, month } = req.params;
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split('T')[0];

    const result = await pool.query(
      "SELECT * FROM bookings WHERE preferred_date >= $1 AND preferred_date <= $2 AND status = 'approved' ORDER BY preferred_date, preferred_time",
      [startDate, endDate]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Calendar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

function timeToMinutes(timeStr) {
  const str = typeof timeStr === 'string' ? timeStr : timeStr.toString();
  const parts = str.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function dateHash(dateStr) {
  let h = 0;
  for (let i = 0; i < dateStr.length; i++) {
    h = (Math.imul(31, h) + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function lcg(state) {
  return ((state * 1664525 + 1013904223) & 0x7fffffff);
}

export default router;
