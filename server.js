import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import authRoutes from './server/auth.js';
import bookingRoutes from './server/bookings.js';
import settingsRoutes from './server/settings.js';
import messageRoutes from './server/messages.js';
import productRoutes from './server/products.js';
import pageRoutes from './server/pages.js';
import investmentRoutes from './server/investment.js';
import eventRoutes from './server/events.js';
import doorRoutes from './server/door.js';
import pool from './server/db.js';
import { initDb } from './server/initDb.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PgSession = connectPgSimple(session);

app.use(express.json({ limit: '20mb' }));

const isProduction = process.env.NODE_ENV === 'production';
app.set('trust proxy', 1);

app.use(session({
  store: new PgSession({
    pool: pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  }
}));

app.use((req, res, next) => {
  if (req.session.adminId && req.session.lastActivity) {
    const inactiveTime = Date.now() - req.session.lastActivity;
    if (inactiveTime > 30 * 60 * 1000) {
      req.session.destroy(() => {});
      return res.status(401).json({ error: 'Session expired due to inactivity' });
    }
    req.session.lastActivity = Date.now();
  }
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/products', productRoutes);
app.use('/api/pages', pageRoutes);
app.use('/api/investment', investmentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/door', doorRoutes);

app.get('/api/market-data', async (req, res) => {
  try {
    const symbols = ['^GSPC', 'NVDA', 'AAPL', 'GOOGL', 'META', 'BTC-USD', 'ETH-USD'];
    const results = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`
          );
          const data = await response.json();
          const meta = data.chart.result[0].meta;
          const price = meta.regularMarketPrice;
          const previousClose = meta.chartPreviousClose || meta.previousClose;
          const change = previousClose ? ((price - previousClose) / previousClose) * 100 : 0;
          const nameMap = {
            '^GSPC': 'S&P 500',
            'NVDA': 'NVIDIA',
            'AAPL': 'APPLE',
            'GOOGL': 'Google',
            'META': 'Meta',
            'BTC-USD': 'BTC',
            'ETH-USD': 'ETH',
          };
          return {
            symbol: nameMap[symbol] || symbol,
            price: price,
            change: parseFloat(change.toFixed(2)),
          };
        } catch {
          const nameMap2 = { '^GSPC': 'S&P 500', 'NVDA': 'NVIDIA', 'AAPL': 'APPLE', 'GOOGL': 'Google', 'META': 'Meta', 'BTC-USD': 'BTC', 'ETH-USD': 'ETH' };
          return { symbol: nameMap2[symbol] || symbol, price: null, change: null };
        }
      })
    );
    res.json(results);
  } catch (err) {
    console.error('Market data error:', err);
    res.status(500).json({ error: 'Failed to fetch market data' });
  }
});

app.use(express.static(path.join(__dirname, 'dist'), {
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'no-cache');
  }
}));

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

async function seedDatabase() {
  try {
    const adminCount = await pool.query('SELECT COUNT(*) FROM admin_users');
    if (parseInt(adminCount.rows[0].count) === 0) {
      const adminUser = process.env.ADMIN_DEFAULT_USER || '199621147';
      const adminPass = process.env.ADMIN_DEFAULT_PASS || '199621147';
      const hash = await bcrypt.hash(adminPass, 10);
      await pool.query('INSERT INTO admin_users (username, password_hash) VALUES ($1, $2)', [adminUser, hash]);
      console.log('Default admin user created');
    }

    const rulesCount = await pool.query('SELECT COUNT(*) FROM availability_rules');
    if (parseInt(rulesCount.rows[0].count) === 0) {
      const days = [
        [0, false], [1, true], [2, true], [3, true], [4, true], [5, true], [6, false]
      ];
      for (const [day, working] of days) {
        await pool.query(
          'INSERT INTO availability_rules (day_of_week, is_working_day, open_time, close_time, lunch_start, lunch_end) VALUES ($1, $2, $3, $4, $5, $6)',
          [day, working, '09:00', '17:00', '12:00', '13:00']
        );
      }
      console.log('Default availability rules created');
    }

    const settingsCount = await pool.query('SELECT COUNT(*) FROM booking_settings');
    if (parseInt(settingsCount.rows[0].count) === 0) {
      await pool.query("INSERT INTO booking_settings (setting_key, setting_value) VALUES ('meeting_duration_minutes', '30'), ('buffer_minutes', '30'), ('prevent_same_day_booking', 'false')");
      console.log('Default booking settings created');
    }

    const templatesCount = await pool.query('SELECT COUNT(*) FROM email_templates');
    if (parseInt(templatesCount.rows[0].count) === 0) {
      await pool.query(`INSERT INTO email_templates (template_type, subject, body) VALUES
        ('confirmation', 'Meeting Confirmed - Aimal.fi Advisory', E'Dear {first_name},\\n\\nYour meeting has been confirmed.\\n\\nDate: {date}\\nTime: {time}\\n\\nWe look forward to meeting you.\\n\\nBest regards,\\nAimal.fi Advisory'),
        ('decline', 'Meeting Request Update - Aimal.fi Advisory', E'Dear {first_name},\\n\\nRegarding your meeting request for {date} at {time}:\\n\\n{reason}\\n\\nPlease feel free to book another time.\\n\\nBest regards,\\nAimal.fi Advisory'),
        ('cancellation', 'Meeting Cancelled - Aimal.fi Advisory', E'Dear {first_name},\\n\\nWe regret to inform you that your meeting scheduled for {date} at {time} has been cancelled.\\n\\nReason: {reason}\\n\\nWe apologize for any inconvenience. Please feel free to book a new meeting at your convenience.\\n\\nBest regards,\\nAimal.fi Advisory')`);
      console.log('Default email templates created');
    }
  } catch (err) {
    console.error('Database seed error:', err);
  }
}

initDb().then(() => seedDatabase()).then(() => {
  app.listen(5000, '0.0.0.0', () => {
    console.log('Server running on port 5000');
  });
});
