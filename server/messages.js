import { Router } from 'express';
import pool from './db.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.post('/send', async (req, res) => {
  try {
    const { firstName, lastName, email, phone, message } = req.body;

    if (!firstName || !lastName || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address' });
    }

    const result = await pool.query(
      `INSERT INTO contact_messages (first_name, last_name, email, phone, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [firstName, lastName, email, phone || '', message]
    );

    res.json({ success: true, messageId: result.rows[0].id });
  } catch (err) {
    console.error('Message send error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', requireAdmin, async (req, res) => {
  try {
    const messages = await pool.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC'
    );
    res.json(messages.rows);
  } catch (err) {
    console.error('Messages fetch error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/read', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE contact_messages SET is_read = TRUE WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Mark read error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/unread-count', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM contact_messages WHERE is_read = FALSE');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
