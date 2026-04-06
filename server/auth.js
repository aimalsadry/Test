import { Router } from 'express';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const router = Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.adminId = user.id;
    req.session.adminUser = user.username;
    req.session.lastActivity = Date.now();

    res.json({ success: true, username: user.username });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session.adminId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json({ username: req.session.adminUser });
});

router.post('/change-password', async (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await pool.query('SELECT * FROM admin_users WHERE id = $1', [req.session.adminId]);
    const user = result.rows[0];
    const valid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!valid) return res.status(400).json({ error: 'Current password incorrect' });

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE admin_users SET password_hash = $1 WHERE id = $2', [hash, req.session.adminId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
