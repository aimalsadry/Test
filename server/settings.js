import { Router } from 'express';
import pool from './db.js';

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/availability', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM availability_rules ORDER BY day_of_week');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/availability', requireAdmin, async (req, res) => {
  try {
    const { rules } = req.body;
    for (const rule of rules) {
      await pool.query(
        `UPDATE availability_rules SET is_working_day = $1, open_time = $2, close_time = $3, lunch_start = $4, lunch_end = $5 WHERE day_of_week = $6`,
        [rule.is_working_day, rule.open_time, rule.close_time, rule.lunch_start, rule.lunch_end, rule.day_of_week]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/blocked-dates', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM blocked_dates ORDER BY blocked_date');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/blocked-dates', requireAdmin, async (req, res) => {
  try {
    const { date, reason } = req.body;
    await pool.query(
      'INSERT INTO blocked_dates (blocked_date, reason) VALUES ($1, $2) ON CONFLICT (blocked_date) DO UPDATE SET reason = $2',
      [date, reason || '']
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/blocked-dates/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM blocked_dates WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/booking-settings', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM booking_settings');
    const settings = {};
    result.rows.forEach(r => { settings[r.setting_key] = r.setting_value; });
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/booking-settings', requireAdmin, async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings)) {
      await pool.query(
        'INSERT INTO booking_settings (setting_key, setting_value) VALUES ($1, $2) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $2',
        [key, value]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/email-templates', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM email_templates');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/email-templates/:type', requireAdmin, async (req, res) => {
  try {
    const { subject, body } = req.body;
    await pool.query(
      'UPDATE email_templates SET subject = $1, body = $2, updated_at = NOW() WHERE template_type = $3',
      [subject, body, req.params.type]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/profile-image', async (req, res) => {
  try {
    const result = await pool.query("SELECT setting_value FROM booking_settings WHERE setting_key = 'profile_image'");
    const image = result.rows.length > 0 ? result.rows[0].setting_value : null;
    res.json({ image });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/profile-image', requireAdmin, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: 'No image provided' });
    await pool.query(
      "INSERT INTO booking_settings (setting_key, setting_value) VALUES ('profile_image', $1) ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1",
      [image]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/profile-image', requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM booking_settings WHERE setting_key = 'profile_image'");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
