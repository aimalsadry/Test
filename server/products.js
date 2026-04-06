import { Router } from 'express';
import pool from './db.js';
import { randomUUID } from 'crypto';
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

const router = Router();

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Not authenticated' });
  next();
}

router.get('/header', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, slug FROM products WHERE show_in_header = true AND slug IS NOT NULL ORDER BY created_at ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Header products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/public', async (req, res) => {
  try {
    const lang = String(req.query.lang || 'en').toLowerCase();
    const result = await pool.query(`
      SELECT p.id, p.title, p.price, p.discount_percent, p.slug,
        COALESCE(
          (SELECT pi.image_data FROM product_images pi WHERE pi.product_id = p.id AND pi.is_main = true LIMIT 1),
          (SELECT pi.image_data FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.id ASC LIMIT 1)
        ) as main_image
      FROM products p
      WHERE p.is_published = true AND p.slug IS NOT NULL AND p.show_in_products_page = true
      ORDER BY p.created_at DESC
    `);
    const rows = await Promise.all(
      result.rows.map(p => overlayTranslations(p, 'product', p.id, lang, ['title']))
    );
    res.json(rows);
  } catch (err) {
    console.error('Public products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const products = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
    const result = [];
    for (const product of products.rows) {
      const images = await pool.query(
        'SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_main DESC, id ASC',
        [product.id]
      );
      const keyCount = await pool.query(
        'SELECT COUNT(*) FROM product_access_keys WHERE product_id = $1 AND is_used = false',
        [product.id]
      );
      result.push({
        ...product,
        images: images.rows,
        available_keys: parseInt(keyCount.rows[0].count),
      });
    }
    res.json(result);
  } catch (err) {
    console.error('List products error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/by-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const lang = String(req.query.lang || 'en').toLowerCase();
    const product = await pool.query('SELECT * FROM products WHERE slug = $1', [slug]);
    if (product.rows.length === 0) return res.status(404).json({ error: 'Product not found' });

    const p = product.rows[0];
    const [images, keyCount, checkoutFields] = await Promise.all([
      pool.query('SELECT * FROM product_images WHERE product_id = $1 ORDER BY is_main DESC, id ASC', [p.id]),
      pool.query(
        `SELECT COUNT(*) as total, COUNT(CASE WHEN is_used = false THEN 1 END) as available
         FROM product_access_keys WHERE product_id = $1`,
        [p.id]
      ),
      pool.query(
        'SELECT id, field_type, field_label, field_placeholder, is_required, sort_order FROM product_checkout_fields WHERE product_id = $1 ORDER BY sort_order, id',
        [p.id]
      ),
    ]);
    const totalKeys = parseInt(keyCount.rows[0].total);
    const availableKeys = parseInt(keyCount.rows[0].available);
    const canPurchase = Number(p.price) === 0 || !!process.env.SUMUP_API_KEY || !!p.sumup_checkout_url;

    const translated = await overlayTranslations(p, 'product', p.id, lang, ['title', 'description']);

    res.json({
      ...translated,
      images: images.rows,
      has_keys: totalKeys > 0,
      keys_available: availableKeys,
      is_out_of_stock: !!p.is_out_of_stock,
      can_purchase: !p.is_out_of_stock && canPurchase && (totalKeys === 0 || availableKeys > 0 || Number(p.price) === 0),
      checkout_info_enabled: !!p.checkout_info_enabled,
      book_to_receive_enabled: !!p.book_to_receive_enabled,
      book_to_receive_title: p.book_to_receive_title || '',
      book_to_receive_buffer_days: parseInt(p.book_to_receive_buffer_days) || 0,
      checkout_fields: checkoutFields.rows,
    });
  } catch (err) {
    console.error('Get product by slug error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, price, discount_percent, receipt_sentence, sumup_checkout_url } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });

    const result = await pool.query(
      `INSERT INTO products (title, description, price, discount_percent, receipt_sentence, sumup_checkout_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, description || '', parseFloat(price) || 0, parseFloat(discount_percent) || 0, receipt_sentence || '', sumup_checkout_url || '']
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/duplicate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const src = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (src.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const s = src.rows[0];

    const result = await pool.query(
      `INSERT INTO products
        (title, description, price, discount_percent, receipt_sentence, sumup_checkout_url, is_published, show_in_header)
       VALUES ($1, $2, $3, $4, $5, $6, false, false) RETURNING *`,
      [
        `${s.title} (Copy)`,
        s.description || '',
        s.price,
        s.discount_percent,
        s.receipt_sentence || '',
        s.sumup_checkout_url || '',
      ]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Duplicate product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, price, discount_percent, receipt_sentence, sumup_checkout_url, checkout_info_enabled, book_to_receive_enabled, book_to_receive_title, book_to_receive_buffer_days } = req.body;

    const result = await pool.query(
      `UPDATE products SET title=$1, description=$2, price=$3, discount_percent=$4,
       receipt_sentence=$5, sumup_checkout_url=$6, checkout_info_enabled=$7, book_to_receive_enabled=$8,
       book_to_receive_title=$9, book_to_receive_buffer_days=$10, updated_at=NOW() WHERE id=$11 RETURNING *`,
      [title, description || '', parseFloat(price) || 0, parseFloat(discount_percent) || 0, receipt_sentence || '', sumup_checkout_url || '', !!checkout_info_enabled, !!book_to_receive_enabled, book_to_receive_title || '', parseInt(book_to_receive_buffer_days) || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    await pool.query('DELETE FROM content_translations WHERE entity_type=$1 AND entity_id=$2', ['product', id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM product_images WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM product_access_keys WHERE product_id = $1', [id]);
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_data, is_main } = req.body;
    if (!image_data) return res.status(400).json({ error: 'Image data required' });

    if (is_main) {
      await pool.query('UPDATE product_images SET is_main = false WHERE product_id = $1', [id]);
    }

    const result = await pool.query(
      'INSERT INTO product_images (product_id, image_data, is_main) VALUES ($1, $2, $3) RETURNING *',
      [id, image_data, is_main || false]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Add image error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/images/:imageId/set-main', requireAdmin, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    await pool.query('UPDATE product_images SET is_main = false WHERE product_id = $1', [id]);
    await pool.query('UPDATE product_images SET is_main = true WHERE id = $1 AND product_id = $2', [imageId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Set main image error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/images/:imageId', requireAdmin, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    await pool.query('DELETE FROM product_images WHERE id = $1 AND product_id = $2', [imageId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete image error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/access-keys', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { keys_text } = req.body;
    if (!keys_text) return res.status(400).json({ error: 'Keys text required' });

    const keys = keys_text
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keys.length === 0) return res.status(400).json({ error: 'No valid keys found' });

    let inserted = 0;
    for (const key of keys) {
      try {
        const r = await pool.query(
          'INSERT INTO product_access_keys (product_id, key_value) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, key]
        );
        inserted += r.rowCount || 0;
      } catch { }
    }

    res.json({ success: true, inserted });
  } catch (err) {
    console.error('Import access keys error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/access-keys', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const total = await pool.query('SELECT COUNT(*) FROM product_access_keys WHERE product_id = $1', [id]);
    const available = await pool.query('SELECT COUNT(*) FROM product_access_keys WHERE product_id = $1 AND is_used = false', [id]);
    const keys = await pool.query(
      'SELECT id, key_value, is_used, created_at FROM product_access_keys WHERE product_id = $1 ORDER BY is_used ASC, id DESC',
      [id]
    );
    res.json({
      total: parseInt(total.rows[0].count),
      available: parseInt(available.rows[0].count),
      keys: keys.rows,
    });
  } catch (err) {
    console.error('List access keys error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/access-keys/:keyId', requireAdmin, async (req, res) => {
  try {
    const { id, keyId } = req.params;
    await pool.query('DELETE FROM product_access_keys WHERE id = $1 AND product_id = $2 AND is_used = false', [keyId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete access key error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/set-slug', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { slug } = req.body;
    if (!slug) return res.status(400).json({ error: 'Slug required' });

    const slugClean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (!slugClean) return res.status(400).json({ error: 'Invalid slug' });

    const RESERVED_SLUGS = ['admin', 'about', 'blog', 'receipt', 'api', 'products', 'product', 'card', 'investment', 'home', 'more'];
    if (RESERVED_SLUGS.includes(slugClean)) {
      return res.status(409).json({ error: `"${slugClean}" is a reserved path and cannot be used as a product URL` });
    }

    const existing = await pool.query('SELECT id FROM products WHERE slug = $1 AND id != $2', [slugClean, id]);
    if (existing.rows.length > 0) return res.status(409).json({ error: 'This URL is already taken by another product' });

    const result = await pool.query('UPDATE products SET slug = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [slugClean, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Set slug error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/header', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { show_in_header } = req.body;
    const result = await pool.query(
      'UPDATE products SET show_in_header = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [show_in_header, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle header error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/publish', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_published } = req.body;
    const result = await pool.query(
      'UPDATE products SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [!!is_published, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Publish product error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/out-of-stock', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_out_of_stock } = req.body;
    const result = await pool.query(
      'UPDATE products SET is_out_of_stock = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [!!is_out_of_stock, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle out-of-stock error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id/show-in-products-page', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { show_in_products_page } = req.body;
    const result = await pool.query(
      'UPDATE products SET show_in_products_page = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [!!show_in_products_page, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Toggle show-in-products-page error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id/checkout-fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM product_checkout_fields WHERE product_id = $1 ORDER BY sort_order, id',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('List checkout fields error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/checkout-fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { field_type, field_label, field_placeholder, is_required, sort_order } = req.body;
    if (!field_label || !field_label.trim()) return res.status(400).json({ error: 'Field label required' });
    const result = await pool.query(
      'INSERT INTO product_checkout_fields (product_id, field_type, field_label, field_placeholder, is_required, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, field_type || 'text', field_label.trim(), field_placeholder || '', is_required !== false, sort_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Add checkout field error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/checkout-fields/:fieldId', requireAdmin, async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    const { sort_order } = req.body;
    const result = await pool.query(
      'UPDATE product_checkout_fields SET sort_order=$1 WHERE id=$2 AND product_id=$3 RETURNING *',
      [sort_order, fieldId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Field not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update checkout field error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id/checkout-fields/:fieldId', requireAdmin, async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    await pool.query('DELETE FROM product_checkout_fields WHERE id=$1 AND product_id=$2', [fieldId, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete checkout field error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/purchase', async (req, res) => {
  try {
    const { id } = req.params;
    const { buyer_name, buyer_email, checkout_info, booked_slot } = req.body;

    if (!buyer_name || !buyer_email) return res.status(400).json({ error: 'Name and email required' });

    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (productResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const product = productResult.rows[0];

    if (product.is_out_of_stock) {
      return res.status(503).json({ error: 'This product is currently out of stock.' });
    }

    if (product.book_to_receive_enabled) {
      if (!booked_slot || !String(booked_slot).trim()) {
        return res.status(400).json({ error: 'A booking date and time is required for this product.' });
      }
    }

    if (product.checkout_info_enabled) {
      const fieldsResult = await pool.query(
        'SELECT * FROM product_checkout_fields WHERE product_id = $1 ORDER BY sort_order, id',
        [id]
      );
      const requiredFields = fieldsResult.rows.filter(f => f.is_required);
      if (requiredFields.length > 0) {
        const info = checkout_info || {};
        for (const field of requiredFields) {
          const val = info[field.field_label];
          if (!val || !String(val).trim()) {
            return res.status(400).json({ error: `"${field.field_label}" is required.` });
          }
        }
      }
    }

    const finalPrice = product.discount_percent > 0
      ? product.price * (1 - product.discount_percent / 100)
      : product.price;

    const isFree = Number(finalPrice) === 0;
    const sumupApiKey = process.env.SUMUP_API_KEY;
    const hasStaticUrl = !!product.sumup_checkout_url;

    if (!isFree && !sumupApiKey && !hasStaticUrl) {
      return res.status(503).json({ error: 'Payment is not yet configured for this product. Please check back soon.' });
    }

    const keyStockResult = await pool.query(
      `SELECT COUNT(*) as total, COUNT(CASE WHEN is_used = false THEN 1 END) as available
       FROM product_access_keys WHERE product_id = $1`,
      [id]
    );
    const totalKeys = parseInt(keyStockResult.rows[0].total);
    const availableKeys = parseInt(keyStockResult.rows[0].available);
    if (!isFree && totalKeys > 0 && availableKeys === 0) {
      return res.status(503).json({ error: 'This product is currently sold out. Please check back later.' });
    }

    const receiptToken = randomUUID();

    const purchaseResult = await pool.query(
      `INSERT INTO product_purchases (product_id, buyer_name, buyer_email, amount_paid, status, receipt_token, checkout_info, booked_slot)
       VALUES ($1, $2, $3, $4, 'pending', $5, $6, $7) RETURNING *`,
      [id, buyer_name, buyer_email, finalPrice, receiptToken, checkout_info ? JSON.stringify(checkout_info) : null, booked_slot ? String(booked_slot).trim() : null]
    );
    const purchase = purchaseResult.rows[0];

    let checkoutUrl = null;
    const returnUrl = `${req.protocol}://${req.get('host')}/receipt/${purchase.id}?token=${receiptToken}`;

    if (!isFree && sumupApiKey) {
      try {
        const checkoutReference = `AIMAL-${purchase.id}-${Date.now()}`;

        const sumupRes = await fetch('https://api.sumup.com/v0.1/checkouts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sumupApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            checkout_reference: checkoutReference,
            amount: finalPrice,
            currency: 'EUR',
            description: product.title,
            return_url: returnUrl,
          }),
        });

        if (sumupRes.ok) {
          const sumupData = await sumupRes.json();
          checkoutUrl = sumupData.checkout_url;
          await pool.query(
            'UPDATE product_purchases SET sumup_checkout_ref = $1, sumup_checkout_id = $2 WHERE id = $3',
            [checkoutReference, sumupData.id, purchase.id]
          );
        } else {
          console.error('SumUp checkout creation failed:', await sumupRes.text());
        }
      } catch (sumupErr) {
        console.error('SumUp checkout creation error:', sumupErr);
      }
    }

    if (!isFree && !checkoutUrl && hasStaticUrl) {
      const sep = product.sumup_checkout_url.includes('?') ? '&' : '?';
      checkoutUrl = `${product.sumup_checkout_url}${sep}return_url=${encodeURIComponent(returnUrl)}`;
    }

    res.json({
      purchaseId: purchase.id,
      receiptToken,
      checkoutUrl,
      amount: finalPrice,
    });
  } catch (err) {
    console.error('Create purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/purchases/:purchaseId/confirm', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { receipt_token } = req.body;

    if (!receipt_token) return res.status(401).json({ error: 'Receipt token required' });

    const purchaseResult = await pool.query(
      'SELECT * FROM product_purchases WHERE id = $1 AND receipt_token = $2',
      [purchaseId, receipt_token]
    );
    if (purchaseResult.rows.length === 0) return res.status(404).json({ error: 'Purchase not found' });

    const purchase = purchaseResult.rows[0];

    if (purchase.status === 'completed') {
      const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [purchase.product_id]);
      const keyResult = purchase.access_key_id
        ? await pool.query('SELECT key_value FROM product_access_keys WHERE id = $1', [purchase.access_key_id])
        : { rows: [] };
      return res.json({
        purchase,
        product: productResult.rows[0],
        accessKey: keyResult.rows[0]?.key_value || null,
      });
    }

    const isFree = Number(purchase.amount_paid) === 0;
    let paymentVerified = isFree;

    const sumupApiKey = process.env.SUMUP_API_KEY;

    if (!isFree) {
      if (sumupApiKey && purchase.sumup_checkout_id) {
        try {
          const verifyRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${purchase.sumup_checkout_id}`, {
            headers: { 'Authorization': `Bearer ${sumupApiKey}` },
          });
          if (!verifyRes.ok) {
            return res.status(402).json({ error: 'Could not verify payment with SumUp.' });
          }
          const checkoutData = await verifyRes.json();
          if (checkoutData.status === 'PAID') {
            paymentVerified = true;
          } else {
            return res.status(402).json({ error: `Payment not confirmed. Status: ${checkoutData.status || 'unknown'}` });
          }
        } catch {
          return res.status(502).json({ error: 'Error communicating with payment provider.' });
        }
      } else if (!purchase.sumup_checkout_id) {
        return res.status(402).json({
          error: 'Your payment is being reviewed manually. Your access key will be delivered by email once confirmed.',
          pendingManualReview: true,
        });
      } else {
        return res.status(402).json({ error: 'Payment cannot be verified.' });
      }
    }

    if (!paymentVerified) {
      return res.status(402).json({ error: 'Payment not verified.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const claimResult = await client.query(
        `UPDATE product_purchases SET status = 'completed', updated_at = NOW()
         WHERE id = $1 AND status = 'pending' RETURNING *`,
        [purchaseId]
      );

      if (claimResult.rowCount === 0) {
        await client.query('ROLLBACK');
        const existing = await pool.query(
          'SELECT pp.*, pak.key_value FROM product_purchases pp LEFT JOIN product_access_keys pak ON pak.id = pp.access_key_id WHERE pp.id = $1',
          [purchaseId]
        );
        const prod = await pool.query('SELECT * FROM products WHERE id = $1', [purchase.product_id]);
        return res.json({
          purchase: existing.rows[0],
          product: prod.rows[0],
          accessKey: existing.rows[0]?.key_value || null,
        });
      }

      const productResult = await client.query('SELECT * FROM products WHERE id = $1', [purchase.product_id]);
      const product = productResult.rows[0];

      const totalKeysResult = await client.query(
        'SELECT COUNT(*) FROM product_access_keys WHERE product_id = $1',
        [purchase.product_id]
      );
      const productHasKeys = parseInt(totalKeysResult.rows[0].count) > 0;

      let accessKey = null;

      if (productHasKeys) {
        const keyResult = await client.query(
          'SELECT id, key_value FROM product_access_keys WHERE product_id = $1 AND is_used = false LIMIT 1 FOR UPDATE SKIP LOCKED',
          [purchase.product_id]
        );

        if (keyResult.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(503).json({ error: 'No access keys available. Please contact us directly.' });
        }

        const key = keyResult.rows[0];
        await client.query(
          'UPDATE product_access_keys SET is_used = true, used_at = NOW(), used_by_purchase_id = $1 WHERE id = $2',
          [purchaseId, key.id]
        );
        await client.query(
          'UPDATE product_purchases SET access_key_id = $1 WHERE id = $2',
          [key.id, purchaseId]
        );
        accessKey = key.key_value;
      }

      await client.query('COMMIT');

      const updatedPurchase = await pool.query('SELECT * FROM product_purchases WHERE id = $1', [purchaseId]);

      res.json({
        purchase: updatedPurchase.rows[0],
        product,
        accessKey,
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Confirm purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/purchases/:purchaseId', async (req, res) => {
  try {
    const { purchaseId } = req.params;
    const { token } = req.query;

    if (!token) return res.status(401).json({ error: 'Receipt token required' });

    const purchaseResult = await pool.query(
      'SELECT * FROM product_purchases WHERE id = $1 AND receipt_token = $2',
      [purchaseId, token]
    );
    if (purchaseResult.rows.length === 0) return res.status(404).json({ error: 'Purchase not found' });

    const purchase = purchaseResult.rows[0];
    const productResult = await pool.query('SELECT * FROM products WHERE id = $1', [purchase.product_id]);
    const keyResult = purchase.access_key_id
      ? await pool.query('SELECT key_value FROM product_access_keys WHERE id = $1', [purchase.access_key_id])
      : { rows: [] };

    res.json({
      purchase,
      product: productResult.rows[0],
      accessKey: keyResult.rows[0]?.key_value || null,
    });
  } catch (err) {
    console.error('Get purchase error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
