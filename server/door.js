import express from 'express';
import crypto from 'crypto';
import pool from './db.js';

const router = express.Router();

const STARTUP_SECRET = crypto.randomBytes(32).toString('hex');

const WINDOW_MS = 12 * 60 * 60 * 1000;

function parseDoorToken(cookieHeader) {
  if (!cookieHeader) return null;
  const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('door_token='));
  return match ? match.slice('door_token='.length) : null;
}

async function getDoorPin() {
  if (process.env.DOOR_PIN) return process.env.DOOR_PIN;
  const result = await pool.query(
    "SELECT setting_value FROM booking_settings WHERE setting_key = 'door_pin'"
  );
  return result.rows.length > 0 && result.rows[0].setting_value ? result.rows[0].setting_value : null;
}

function makeToken(pin, secret) {
  const window = Math.floor(Date.now() / WINDOW_MS);
  return crypto.createHmac('sha256', secret).update(`door:${pin}:${window}`).digest('hex');
}

async function isValidDoorToken(token) {
  const pin = await getDoorPin();
  if (!pin) return false;
  const secret = process.env.SESSION_SECRET || STARTUP_SECRET;
  const now = Math.floor(Date.now() / WINDOW_MS);
  for (const w of [now, now - 1]) {
    const expected = crypto.createHmac('sha256', secret).update(`door:${pin}:${w}`).digest('hex');
    if (crypto.timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(expected, 'hex'))) {
      return true;
    }
  }
  return false;
}

const requireDoor = async (req, res, next) => {
  try {
    const token = parseDoorToken(req.headers.cookie);
    if (!token || token.length !== 64) {
      return res.status(401).json({ error: 'Door authentication required' });
    }
    const valid = await isValidDoorToken(token);
    if (!valid) return res.status(401).json({ error: 'Door authentication required' });
    next();
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
};

router.get('/status', async (req, res) => {
  try {
    const token = parseDoorToken(req.headers.cookie);
    if (!token || token.length !== 64) return res.json({ authenticated: false });
    const valid = await isValidDoorToken(token);
    res.json({ authenticated: valid });
  } catch {
    res.json({ authenticated: false });
  }
});

router.post('/auth', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin) return res.status(400).json({ error: 'PIN required' });

    const stored = await getDoorPin();
    if (!stored) {
      return res.status(403).json({ error: 'Door PIN not configured. Set a Door PIN in Admin → Settings → Booking Rules.' });
    }

    if (pin !== stored) {
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    const secret = process.env.SESSION_SECRET || STARTUP_SECRET;
    const token = makeToken(stored, secret);
    const maxAge = WINDOW_MS;
    const isProduction = process.env.NODE_ENV === 'production';

    res.setHeader('Set-Cookie',
      `door_token=${token}; HttpOnly; SameSite=Lax; Max-Age=${maxAge / 1000}; Path=/${isProduction ? '; Secure' : ''}`
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'door_token=; HttpOnly; SameSite=Lax; Max-Age=0; Path=/');
  res.json({ success: true });
});

router.get('/verify/:token', requireDoor, async (req, res) => {
  try {
    const { token } = req.params;
    const { eventId } = req.query;

    let query = `
      SELECT et.id, et.ticket_token, et.is_checked_in, et.checked_in_at,
             ep.buyer_name, ep.package_name, ep.event_id, ep.quantity,
             (SELECT COUNT(*) FROM event_tickets et2 WHERE et2.purchase_id = ep.id) AS ticket_count,
             e.title as event_title, e.date as event_date, e.time as event_time, e.venue as event_venue
      FROM event_tickets et
      JOIN event_purchases ep ON ep.id = et.purchase_id
      JOIN events e ON e.id = ep.event_id
      WHERE et.ticket_token = $1 AND ep.status = 'paid'`;
    const params = [token];

    if (eventId) {
      query += ` AND ep.event_id = $2`;
      params.push(Number(eventId));
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or unrecognised ticket', scan_status: 'invalid' });
    }

    const ticket = result.rows[0];
    const admits = Number(ticket.ticket_count) === 1 ? Number(ticket.quantity) : 1;
    res.json({
      ...ticket,
      admits,
      scan_status: ticket.is_checked_in ? 'already_used' : 'pending',
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/checkin/:token', requireDoor, async (req, res) => {
  try {
    const { token } = req.params;
    const { eventId } = req.body;

    let query = `
      SELECT et.id, et.ticket_token, et.is_checked_in, et.checked_in_at,
             ep.buyer_name, ep.package_name, ep.event_id, ep.quantity,
             (SELECT COUNT(*) FROM event_tickets et2 WHERE et2.purchase_id = ep.id) AS ticket_count,
             e.title as event_title, e.date as event_date
      FROM event_tickets et
      JOIN event_purchases ep ON ep.id = et.purchase_id
      JOIN events e ON e.id = ep.event_id
      WHERE et.ticket_token = $1 AND ep.status = 'paid'`;
    const params = [token];

    if (eventId) {
      query += ` AND ep.event_id = $2`;
      params.push(Number(eventId));
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invalid or unrecognised ticket', scan_status: 'invalid' });
    }

    const ticket = result.rows[0];
    const admits = Number(ticket.ticket_count) === 1 ? Number(ticket.quantity) : 1;

    if (ticket.is_checked_in) {
      return res.json({ ...ticket, admits, scan_status: 'already_used' });
    }

    await pool.query(
      'UPDATE event_tickets SET is_checked_in = true, checked_in_at = NOW() WHERE id = $1',
      [ticket.id]
    );

    res.json({ ...ticket, admits, is_checked_in: true, checked_in_at: new Date(), scan_status: 'checked_in' });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/stats/:eventId', requireDoor, async (req, res) => {
  try {
    const { eventId } = req.params;
    const [totalResult, checkedResult] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) FROM event_tickets et
         JOIN event_purchases ep ON ep.id = et.purchase_id
         WHERE ep.event_id = $1 AND ep.status = 'paid'`,
        [eventId]
      ),
      pool.query(
        `SELECT COUNT(*) FROM event_tickets et
         JOIN event_purchases ep ON ep.id = et.purchase_id
         WHERE ep.event_id = $1 AND ep.status = 'paid' AND et.is_checked_in = true`,
        [eventId]
      ),
    ]);

    res.json({
      total: parseInt(totalResult.rows[0].count),
      checked_in: parseInt(checkedResult.rows[0].count),
    });
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/events', requireDoor, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, date, time, venue FROM events WHERE is_published = true ORDER BY date DESC, id DESC LIMIT 30'
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
