import express from 'express';
import pool from './db.js';

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.post('/submit', async (req, res) => {
  try {
    const { first_name, last_name, phone, email, y_tunnus, role, message } = req.body;
    await pool.query(
      `INSERT INTO investment_submissions (first_name, last_name, phone, email, y_tunnus, role, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [first_name || '', last_name || '', phone || '', email || '', y_tunnus || '', role || '', message || '']
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('investment submit error:', err);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

router.get('/submissions', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM investment_submissions ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('investment submissions error:', err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.patch('/submissions/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const VALID = ['new', 'contacted', 'closed'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query(
      'UPDATE investment_submissions SET status = $1 WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('investment status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;
