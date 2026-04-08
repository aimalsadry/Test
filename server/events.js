import express from 'express';
import { randomUUID } from 'crypto';
import pool from './db.js';
import { translateText, isValidLang } from './translate.js';

async function overlayTranslations(obj, entityType, entityId, lang, fields) {
  if (!lang || lang === 'en' || !isValidLang(lang)) return obj;
  const result = { ...obj };
  for (const field of fields) {
    const original = obj[field];
    if (!original) continue;
    const cached = await pool.query(
      'SELECT translated_text FROM content_translations WHERE entity_type=$1 AND entity_id=$2 AND language=$3 AND field_name=$4',
      [entityType, entityId, lang, field]
    );
    if (cached.rows.length > 0) {
      result[field] = cached.rows[0].translated_text;
    } else {
      const translated = await translateText(original, lang);
      await pool.query(
        `INSERT INTO content_translations (entity_type, entity_id, language, field_name, translated_text)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (entity_type, entity_id, language, field_name)
         DO UPDATE SET translated_text = EXCLUDED.translated_text`,
        [entityType, entityId, lang, field, translated]
      );
      result[field] = translated;
    }
  }
  return result;
}

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/header', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, slug FROM events WHERE show_in_header = true AND is_published = true ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const lang = String(req.query.lang || 'en').toLowerCase();
    const result = await pool.query(
      `SELECT id, title, description, date, time, venue, slug, bg_image, bg_type, bg_video, text_bg_color, text_bg_opacity
       FROM events WHERE slug = $1 AND is_published = true`,
      [slug]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    let event = result.rows[0];
    event = await overlayTranslations(event, 'event', event.id, lang, ['title', 'description']);
    const pkgs = await pool.query(
      'SELECT id, name, description, price, payment_link, sort_order FROM event_packages WHERE event_id = $1 ORDER BY sort_order, id',
      [event.id]
    );
    const imgs = await pool.query(
      'SELECT id, image_data, sort_order FROM event_images WHERE event_id = $1 ORDER BY sort_order, id',
      [event.id]
    );
    res.json({ ...event, packages: pkgs.rows, images: imgs.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/purchase', async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_name, buyer_email, buyer_phone, package_id, quantity, buyer_note } = req.body;

    if (!buyer_name || !buyer_email || !buyer_phone) {
      return res.status(400).json({ error: 'Name, email, and phone are required' });
    }
    const qty = parseInt(quantity) || 1;
    if (qty < 1 || qty > 10) return res.status(400).json({ error: 'Quantity must be between 1 and 10' });

    const eventResult = await pool.query('SELECT * FROM events WHERE id = $1 AND is_published = true', [id]);
    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });

    const pkgResult = await pool.query(
      'SELECT * FROM event_packages WHERE id = $1 AND event_id = $2',
      [package_id, id]
    );
    if (pkgResult.rows.length === 0) return res.status(400).json({ error: 'Invalid package selected' });

    const pkg = pkgResult.rows[0];
    const amountPaid = parseFloat(pkg.price) * qty;
    const receiptToken = randomUUID();

    const purchaseResult = await pool.query(
      `INSERT INTO event_purchases (event_id, package_id, package_name, package_price, quantity, amount_paid, buyer_name, buyer_email, buyer_phone, buyer_note, status, receipt_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending', $11) RETURNING *`,
      [id, pkg.id, pkg.name, pkg.price, qty, amountPaid, buyer_name, buyer_email, buyer_phone, buyer_note || null, receiptToken]
    );
    const purchase = purchaseResult.rows[0];

    await pool.query(
      'INSERT INTO event_tickets (purchase_id, ticket_token) VALUES ($1, $2)',
      [purchase.id, randomUUID()]
    );

    const isFree = amountPaid === 0;
    const sumupApiKey = process.env.SUMUP_API_KEY;

    if (!isFree && !sumupApiKey) {
      await pool.query('DELETE FROM event_tickets WHERE purchase_id = $1', [purchase.id]);
      await pool.query('DELETE FROM event_purchases WHERE id = $1', [purchase.id]);
      return res.status(503).json({ error: 'Online payment is not currently available. Please contact the organiser.' });
    }

    const returnUrl = `${req.protocol}://${req.get('host')}/event-receipt/${purchase.id}?token=${receiptToken}`;

    let checkoutUrl = null;

    if (!isFree && sumupApiKey) {
      try {
        const checkoutReference = `AIMAL-EVT-${purchase.id}-${Date.now()}`;
        const sumupRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sumupApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_reference: checkoutReference,
            amount: amountPaid,
            currency: 'EUR',
            merchant_code: 'MC6UAALG',
            description: `${eventResult.rows[0].title} — ${pkg.name} x${qty}`,
            return_url: returnUrl,
          }),
        });
        if (sumupRes.ok) {
          const sumupData = await sumupRes.json();
          checkoutUrl = `https://pay.sumup.com/b2c/${sumupData.id}`;
          await pool.query(
            'UPDATE event_purchases SET sumup_checkout_ref = $1, sumup_checkout_id = $2 WHERE id = $3',
            [checkoutReference, sumupData.id, purchase.id]
          );
        } else {
          console.error('SumUp event checkout failed:', await sumupRes.text());
        }
      } catch (err) {
        console.error('SumUp event checkout error:', err);
      }
    }

    if (isFree && !checkoutUrl) {
      await pool.query('UPDATE event_purchases SET status = $1 WHERE id = $2', ['paid', purchase.id]);
    }

    res.json({ purchaseId: purchase.id, receiptToken, checkoutUrl, amount: amountPaid });
  } catch (err) {
    console.error('Event purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/purchases/:purchaseId/confirm', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { receipt_token } = req.body;

    const purchaseResult = await pool.query(
      'SELECT ep.*, e.title as event_title, e.date as event_date, e.time as event_time, e.venue as event_venue FROM event_purchases ep JOIN events e ON e.id = ep.event_id WHERE ep.id = $1 AND ep.receipt_token = $2',
      [purchaseId, receipt_token]
    );
    if (purchaseResult.rows.length === 0) return res.status(404).json({ error: 'Purchase not found' });

    const purchase = purchaseResult.rows[0];

    if (purchase.status === 'pending' && purchase.sumup_checkout_id) {
      try {
        const sumupApiKey = process.env.SUMUP_API_KEY;
        if (sumupApiKey) {
          const checkRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${purchase.sumup_checkout_id}`, {
            headers: { 'Authorization': `Bearer ${sumupApiKey}` },
          });
          if (checkRes.ok) {
            const checkData = await checkRes.json();
            if (checkData.status === 'PAID') {
              await pool.query('UPDATE event_purchases SET status = $1 WHERE id = $2', ['paid', purchaseId]);
              purchase.status = 'paid';
            }
          }
        }
      } catch (err) {
        console.error('SumUp confirm check error:', err);
      }
    }

    if (purchase.status !== 'paid') {
      return res.status(402).json({ error: 'Payment not confirmed', status: purchase.status });
    }

    const ticketsResult = await pool.query(
      'SELECT id, ticket_token, is_checked_in, checked_in_at FROM event_tickets WHERE purchase_id = $1 ORDER BY id',
      [purchaseId]
    );

    res.json({ purchase, tickets: ticketsResult.rows });
  } catch (err) {
    console.error('Event confirm error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/ticket/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const result = await pool.query(
      `SELECT et.id, et.ticket_token, et.is_checked_in, et.checked_in_at,
              ep.buyer_name, ep.buyer_phone, ep.package_name, ep.purchased_at, ep.quantity,
              e.title as event_title, e.date as event_date, e.time as event_time, e.venue as event_venue
       FROM event_tickets et
       JOIN event_purchases ep ON ep.id = et.purchase_id
       JOIN events e ON e.id = ep.event_id
       WHERE et.ticket_token = $1 AND ep.status = 'paid'`,
      [token]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT e.id, e.title, e.description, e.date, e.time, e.venue, e.slug,
             e.bg_image, e.bg_type, e.bg_video, e.text_bg_color, e.text_bg_opacity,
             e.is_published, e.show_in_header, e.bar_host_pin, e.created_at,
             (SELECT COUNT(*) FROM event_packages ep WHERE ep.event_id = e.id) as package_count,
             (SELECT COUNT(*) FROM event_purchases pur WHERE pur.event_id = e.id AND pur.status = 'paid') as attendee_count
      FROM events e ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/header', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { show_in_header } = req.body;
    const result = await pool.query(
      'UPDATE events SET show_in_header = $1 WHERE id = $2 RETURNING id, show_in_header',
      [!!show_in_header, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, image_data, sort_order, created_at FROM event_images WHERE event_id = $1 ORDER BY sort_order, id',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_data } = req.body;
    if (!image_data) return res.status(400).json({ error: 'image_data required' });
    const countResult = await pool.query('SELECT COUNT(*) FROM event_images WHERE event_id = $1', [id]);
    const sortOrder = parseInt(countResult.rows[0].count) || 0;
    const result = await pool.query(
      'INSERT INTO event_images (event_id, image_data, sort_order) VALUES ($1, $2, $3) RETURNING id, sort_order, created_at',
      [id, image_data, sortOrder]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/images/:imgId', requireAdmin, async (req, res) => {
  try {
    const { id, imgId } = req.params;
    await pool.query('DELETE FROM event_images WHERE id = $1 AND event_id = $2', [imgId, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, date, time, venue, slug, text_bg_color, text_bg_opacity, is_published, bg_image, bg_type, bg_video } = req.body;
    if (!title || !slug) return res.status(400).json({ error: 'Title and slug are required' });
    const result = await pool.query(
      `INSERT INTO events (title, description, date, time, venue, slug, text_bg_color, text_bg_opacity, is_published, bg_image, bg_type, bg_video)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [title, description || '', date || '', time || '', venue || '', slug, text_bg_color || '#000000', text_bg_opacity != null ? parseFloat(text_bg_opacity) : 0.5, !!is_published, bg_image || '', bg_type || 'image', bg_video || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Slug already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, date, time, venue, slug, text_bg_color, text_bg_opacity, is_published, bg_image, bg_type, bg_video } = req.body;
    const existing = await pool.query('SELECT title, description FROM events WHERE id=$1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const prev = existing.rows[0];
    if (prev.title !== title || prev.description !== (description || '')) {
      await pool.query(
        `DELETE FROM content_translations WHERE entity_type='event' AND entity_id=$1 AND field_name IN ('title','description')`,
        [id]
      );
    }
    const result = await pool.query(
      `UPDATE events SET title=$1, description=$2, date=$3, time=$4, venue=$5, slug=$6, text_bg_color=$7, text_bg_opacity=$8, is_published=$9, bg_image=$10, bg_type=$11, bg_video=$12
       WHERE id=$13 RETURNING *`,
      [title, description || '', date || '', time || '', venue || '', slug, text_bg_color || '#000000', text_bg_opacity != null ? parseFloat(text_bg_opacity) : 0.5, !!is_published, bg_image || '', bg_type || 'image', bg_video || '', id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    if (err.code === '23505') return res.status(400).json({ error: 'Slug already in use' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM events WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/packages', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, sort_order, payment_link } = req.body;
    if (!name) return res.status(400).json({ error: 'Package name required' });
    const result = await pool.query(
      'INSERT INTO event_packages (event_id, name, description, price, sort_order, payment_link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [id, name, description || '', parseFloat(price) || 0, parseInt(sort_order) || 0, payment_link || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/packages/:pkgId', requireAdmin, async (req, res) => {
  try {
    const { id, pkgId } = req.params;
    const { name, description, price, sort_order, payment_link } = req.body;
    const result = await pool.query(
      'UPDATE event_packages SET name=$1, description=$2, price=$3, sort_order=$4, payment_link=$5 WHERE id=$6 AND event_id=$7 RETURNING *',
      [name, description || '', parseFloat(price) || 0, parseInt(sort_order) || 0, payment_link || '', pkgId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Package not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/packages/:pkgId', requireAdmin, async (req, res) => {
  try {
    const { id, pkgId } = req.params;
    await pool.query('DELETE FROM event_packages WHERE id = $1 AND event_id = $2', [pkgId, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/attendees', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const purchasesResult = await pool.query(
      `SELECT ep.*, array_agg(json_build_object('id', et.id, 'ticket_token', et.ticket_token, 'is_checked_in', et.is_checked_in, 'checked_in_at', et.checked_in_at) ORDER BY et.id) as tickets
       FROM event_purchases ep
       LEFT JOIN event_tickets et ON et.purchase_id = ep.id
       WHERE ep.event_id = $1
       GROUP BY ep.id
       ORDER BY ep.purchased_at DESC`,
      [id]
    );
    res.json(purchasesResult.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/tickets/:ticketId/checkin', requireAdmin, async (req, res) => {
  try {
    const { ticketId } = req.params;
    const ticketResult = await pool.query('SELECT * FROM event_tickets WHERE id = $1', [ticketId]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    const ticket = ticketResult.rows[0];
    const newState = !ticket.is_checked_in;
    const result = await pool.query(
      'UPDATE event_tickets SET is_checked_in = $1, checked_in_at = $2 WHERE id = $3 RETURNING *',
      [newState, newState ? new Date() : null, ticketId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/packages', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, event_id, name, description, price, payment_link, sort_order FROM event_packages WHERE event_id = $1 ORDER BY sort_order, id',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:eventRef/bar-pin', requireAdmin, async (req, res) => {
  try {
    const { eventRef } = req.params;
    const { pin } = req.body;
    let result;
    if (/^\d+$/.test(eventRef)) {
      result = await pool.query(
        'UPDATE events SET bar_host_pin = $1 WHERE id = $2 RETURNING id',
        [pin || null, parseInt(eventRef, 10)]
      );
    } else {
      result = await pool.query(
        'UPDATE events SET bar_host_pin = $1 WHERE slug = $2 RETURNING id',
        [pin || null, eventRef]
      );
    }
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug/bar-pin-check', async (req, res) => {
  try {
    const { slug } = req.params;
    const { pin } = req.query;
    const result = await pool.query('SELECT bar_host_pin FROM events WHERE slug = $1', [slug]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const storedPin = result.rows[0].bar_host_pin || '';
    if (!storedPin) return res.json({ valid: false, reason: 'no_pin_set' });
    res.json({ valid: pin === storedPin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug/table-requests', async (req, res) => {
  try {
    const { slug } = req.params;
    const { table } = req.query;
    if (!table) return res.status(400).json({ error: 'Table number required' });
    const eventResult = await pool.query('SELECT id FROM events WHERE slug = $1', [slug]);
    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const result = await pool.query(
      'SELECT id, table_number, message, status, created_at FROM bar_requests WHERE event_id = $1 AND table_number = $2 ORDER BY created_at DESC',
      [eventResult.rows[0].id, table.toString().trim()]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:slug/bar-request', async (req, res) => {
  try {
    const { slug } = req.params;
    const { table_number, message } = req.body;
    if (!table_number || !message) return res.status(400).json({ error: 'Table number and message are required' });
    const eventResult = await pool.query('SELECT id FROM events WHERE slug = $1 AND is_published = true', [slug]);
    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const eventId = eventResult.rows[0].id;
    const result = await pool.query(
      'INSERT INTO bar_requests (event_id, table_number, message, status) VALUES ($1, $2, $3, $4) RETURNING *',
      [eventId, table_number.toString().trim(), message.toString().trim(), 'pending']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:slug/bar-requests', async (req, res) => {
  try {
    const { slug } = req.params;
    const { pin } = req.query;
    const eventResult = await pool.query('SELECT id, bar_host_pin FROM events WHERE slug = $1', [slug]);
    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = eventResult.rows[0];
    const storedPin = event.bar_host_pin || '';
    if (!storedPin || pin !== storedPin) return res.status(403).json({ error: 'Invalid PIN' });
    const result = await pool.query(
      'SELECT * FROM bar_requests WHERE event_id = $1 ORDER BY created_at DESC',
      [event.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:slug/bar-requests/:reqId', async (req, res) => {
  try {
    const { slug, reqId } = req.params;
    const { pin, status } = req.body;
    const eventResult = await pool.query('SELECT id, bar_host_pin FROM events WHERE slug = $1', [slug]);
    if (eventResult.rows.length === 0) return res.status(404).json({ error: 'Event not found' });
    const event = eventResult.rows[0];
    const storedPin = event.bar_host_pin || '';
    if (!storedPin || pin !== storedPin) return res.status(403).json({ error: 'Invalid PIN' });
    const result = await pool.query(
      'UPDATE bar_requests SET status = $1 WHERE id = $2 AND event_id = $3 RETURNING *',
      [status || 'done', reqId, event.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
