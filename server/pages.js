import express from 'express';
import pool from './db.js';
import { translateText, isValidLang } from './translate.js';

const PAGE_FIELDS = ['hero_label','hero_title','hero_subtitle','left_panel_title','left_panel_desc','right_panel_title','right_panel_desc'];

async function overlayPageTranslations(obj, entityId, lang) {
  if (!lang || lang === 'en' || !isValidLang(lang)) return obj;
  const result = { ...obj };
  for (const field of PAGE_FIELDS) {
    const original = obj[field];
    if (!original) continue;
    const cached = await pool.query(
      'SELECT translated_text FROM content_translations WHERE entity_type=$1 AND entity_id=$2 AND language=$3 AND field_name=$4',
      ['page', entityId, lang, field]
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
        ['page', entityId, lang, field, translated]
      );
      result[field] = translated;
    }
  }
  return result;
}

const router = express.Router();

const RESERVED_SLUGS = ['admin', 'products', 'investment', 'about', 'card', 'receipt', 'api', 'home', 'more', 'product', 'blog'];

function requireAdmin(req, res, next) {
  if (!req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

router.get('/header', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, slug FROM custom_pages WHERE show_in_header = true AND is_published = true AND slug IS NOT NULL ORDER BY created_at ASC'
    );
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
      'UPDATE custom_pages SET show_in_header = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [!!show_in_header, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/admin/all', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cp.*,
        (SELECT COUNT(*) FROM custom_page_images WHERE page_id = cp.id) AS image_count,
        (SELECT COUNT(*) FROM custom_page_submissions WHERE page_id = cp.id) AS submission_count,
        (SELECT COUNT(*) FROM custom_page_submissions WHERE page_id = cp.id AND status = 'new') AS new_submission_count,
        (SELECT COUNT(*) FROM custom_page_form_fields WHERE page_id = cp.id) AS form_field_count,
        (SELECT MAX(created_at) FROM custom_page_submissions WHERE page_id = cp.id) AS last_submission_at
      FROM custom_pages cp
      ORDER BY cp.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch pages' });
  }
});

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' });
    const result = await pool.query(
      'INSERT INTO custom_pages (title) VALUES ($1) RETURNING *',
      [title.trim()]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create page' });
  }
});

router.post('/:id/duplicate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const src = await pool.query('SELECT * FROM custom_pages WHERE id = $1', [id]);
    if (src.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    const s = src.rows[0];

    let newSlug = null;
    if (s.slug) {
      const base = `${s.slug}-copy`;
      let candidate = base;
      let attempt = 1;
      while (true) {
        const conflict = await pool.query('SELECT id FROM custom_pages WHERE slug = $1', [candidate]);
        if (conflict.rows.length === 0) { newSlug = candidate; break; }
        candidate = `${base}-${attempt++}`;
      }
    }

    const newPage = await pool.query(
      `INSERT INTO custom_pages
        (title, slug, hero_label, hero_title, hero_subtitle, left_panel_title, left_panel_desc, right_panel_title, right_panel_desc, is_published)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,false) RETURNING *`,
      [
        `${s.title} (Copy)`, newSlug,
        s.hero_label, s.hero_title, s.hero_subtitle,
        s.left_panel_title, s.left_panel_desc,
        s.right_panel_title, s.right_panel_desc,
      ]
    );
    const newId = newPage.rows[0].id;

    const fields = await pool.query(
      'SELECT * FROM custom_page_form_fields WHERE page_id = $1 ORDER BY sort_order, id',
      [id]
    );
    for (const f of fields.rows) {
      await pool.query(
        'INSERT INTO custom_page_form_fields (page_id, field_type, field_label, field_placeholder, is_required, sort_order) VALUES ($1,$2,$3,$4,$5,$6)',
        [newId, f.field_type, f.field_label, f.field_placeholder, f.is_required, f.sort_order]
      );
    }

    res.json(newPage.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to duplicate page' });
  }
});

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, hero_label, hero_title, hero_subtitle, left_panel_title, left_panel_desc, right_panel_title, right_panel_desc } = req.body;
    const result = await pool.query(
      `UPDATE custom_pages SET
        title = COALESCE($1, title),
        hero_label = COALESCE($2, hero_label),
        hero_title = COALESCE($3, hero_title),
        hero_subtitle = COALESCE($4, hero_subtitle),
        left_panel_title = COALESCE($5, left_panel_title),
        left_panel_desc = COALESCE($6, left_panel_desc),
        right_panel_title = COALESCE($7, right_panel_title),
        right_panel_desc = COALESCE($8, right_panel_desc),
        updated_at = NOW()
      WHERE id = $9 RETURNING *`,
      [title, hero_label, hero_title, hero_subtitle, left_panel_title, left_panel_desc, right_panel_title, right_panel_desc, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    await pool.query('DELETE FROM content_translations WHERE entity_type=$1 AND entity_id=$2', ['page', id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update page' });
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM custom_pages WHERE id = $1', [id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete page' });
  }
});

router.put('/:id/set-slug', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { slug } = req.body;
    if (!slug || !slug.trim()) return res.status(400).json({ error: 'Slug is required' });
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    if (RESERVED_SLUGS.includes(clean)) return res.status(400).json({ error: 'That slug is reserved' });
    const conflict = await pool.query('SELECT id FROM custom_pages WHERE slug = $1 AND id != $2', [clean, id]);
    if (conflict.rows.length > 0) return res.status(400).json({ error: 'Slug already in use' });
    const result = await pool.query('UPDATE custom_pages SET slug = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [clean, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set slug' });
  }
});

router.put('/:id/publish', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const page = await pool.query('SELECT * FROM custom_pages WHERE id = $1', [id]);
    if (page.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    const current = page.rows[0];
    if (!current.is_published && !current.slug) return res.status(400).json({ error: 'Set a slug before publishing' });
    const result = await pool.query('UPDATE custom_pages SET is_published = $1, updated_at = NOW() WHERE id = $2 RETURNING *', [!current.is_published, id]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to toggle publish' });
  }
});

router.get('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM custom_page_images WHERE page_id = $1 ORDER BY is_main DESC, created_at', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch images' });
  }
});

router.post('/:id/images', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { image_data } = req.body;
    if (!image_data) return res.status(400).json({ error: 'Image data required' });
    const existing = await pool.query('SELECT id FROM custom_page_images WHERE page_id = $1', [id]);
    const isFirst = existing.rows.length === 0;
    const result = await pool.query(
      'INSERT INTO custom_page_images (page_id, image_data, is_main) VALUES ($1, $2, $3) RETURNING id, is_main, created_at',
      [id, image_data, isFirst]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to upload image' });
  }
});

router.put('/:id/images/:imageId/set-main', requireAdmin, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    await pool.query('UPDATE custom_page_images SET is_main = false WHERE page_id = $1', [id]);
    await pool.query('UPDATE custom_page_images SET is_main = true WHERE id = $1 AND page_id = $2', [imageId, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to set main image' });
  }
});

router.delete('/:id/images/:imageId', requireAdmin, async (req, res) => {
  try {
    const { id, imageId } = req.params;
    const del = await pool.query('DELETE FROM custom_page_images WHERE id = $1 AND page_id = $2 RETURNING is_main', [imageId, id]);
    if (del.rows[0]?.is_main) {
      const next = await pool.query('SELECT id FROM custom_page_images WHERE page_id = $1 ORDER BY created_at LIMIT 1', [id]);
      if (next.rows.length > 0) await pool.query('UPDATE custom_page_images SET is_main = true WHERE id = $1', [next.rows[0].id]);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

router.get('/:id/form-fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM custom_page_form_fields WHERE page_id = $1 ORDER BY sort_order, id', [id]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch fields' });
  }
});

router.post('/:id/form-fields', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { field_type, field_label, field_placeholder, is_required, sort_order } = req.body;
    const VALID_TYPES = ['text', 'email', 'tel', 'textarea', 'file', 'photo', 'signature'];
    if (!VALID_TYPES.includes(field_type)) return res.status(400).json({ error: 'Invalid field type' });
    if (!field_label || !field_label.trim()) return res.status(400).json({ error: 'Label is required' });
    const result = await pool.query(
      'INSERT INTO custom_page_form_fields (page_id, field_type, field_label, field_placeholder, is_required, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [id, field_type, field_label.trim(), field_placeholder || '', is_required !== false, sort_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add field' });
  }
});

router.put('/:id/form-fields/:fieldId', requireAdmin, async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    const { field_label, field_placeholder, is_required, sort_order } = req.body;
    const result = await pool.query(
      `UPDATE custom_page_form_fields SET
        field_label = COALESCE($1, field_label),
        field_placeholder = COALESCE($2, field_placeholder),
        is_required = COALESCE($3, is_required),
        sort_order = COALESCE($4, sort_order)
      WHERE id = $5 AND page_id = $6 RETURNING *`,
      [field_label, field_placeholder, is_required, sort_order, fieldId, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update field' });
  }
});

router.delete('/:id/form-fields/:fieldId', requireAdmin, async (req, res) => {
  try {
    const { id, fieldId } = req.params;
    await pool.query('DELETE FROM custom_page_form_fields WHERE id = $1 AND page_id = $2', [fieldId, id]);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete field' });
  }
});

router.patch('/:id/submissions/:subId/status', requireAdmin, async (req, res) => {
  try {
    const { id, subId } = req.params;
    const { status } = req.body;
    const VALID = ['new', 'contacted', 'closed'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'Invalid status' });
    const result = await pool.query(
      'UPDATE custom_page_submissions SET status = $1 WHERE id = $2 AND page_id = $3 RETURNING *',
      [status, subId, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('page submission status error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

router.get('/:id/submissions', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT id, form_data, status, created_at FROM custom_page_submissions WHERE page_id = $1 ORDER BY created_at DESC',
      [id]
    );
    const submissions = result.rows;
    const withFiles = await Promise.all(submissions.map(async (sub) => {
      const files = await pool.query(
        'SELECT id, field_label, file_name FROM custom_page_submission_files WHERE submission_id = $1',
        [sub.id]
      );
      return { ...sub, files: files.rows };
    }));
    res.json(withFiles);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

router.get('/:id/submissions/:subId/files/:fileId', requireAdmin, async (req, res) => {
  try {
    const { id, subId, fileId } = req.params;
    const sub = await pool.query('SELECT id FROM custom_page_submissions WHERE id = $1 AND page_id = $2', [subId, id]);
    if (sub.rows.length === 0) return res.status(404).json({ error: 'Submission not found' });
    const result = await pool.query(
      'SELECT file_name, file_data FROM custom_page_submission_files WHERE id = $1 AND submission_id = $2',
      [fileId, subId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'File not found' });
    const { file_name, file_data } = result.rows[0];
    const matches = file_data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return res.status(400).json({ error: 'Invalid file data' });
    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${file_name || 'file'}"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.get('/public/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const isPreview = req.query.preview === 'true' && req.session?.adminId;
    const lang = String(req.query.lang || 'en').toLowerCase();
    const pageResult = await pool.query(
      isPreview
        ? 'SELECT * FROM custom_pages WHERE slug = $1'
        : 'SELECT * FROM custom_pages WHERE slug = $1 AND is_published = true',
      [slug]
    );
    if (pageResult.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    const page = pageResult.rows[0];
    const [fieldsResult, imagesResult, mainImage] = await Promise.all([
      pool.query('SELECT * FROM custom_page_form_fields WHERE page_id = $1 ORDER BY sort_order, id', [page.id]),
      pool.query('SELECT id, is_main, created_at FROM custom_page_images WHERE page_id = $1 ORDER BY is_main DESC, created_at', [page.id]),
      pool.query('SELECT image_data FROM custom_page_images WHERE page_id = $1 AND is_main = true LIMIT 1', [page.id]),
    ]);
    const translated = await overlayPageTranslations(page, page.id, lang);
    res.json({
      ...translated,
      fields: fieldsResult.rows,
      images: imagesResult.rows,
      main_image: mainImage.rows[0]?.image_data || null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch page' });
  }
});

router.post('/:id/submit', async (req, res) => {
  try {
    const { id } = req.params;
    const { form_data, files } = req.body;
    const page = await pool.query('SELECT id FROM custom_pages WHERE id = $1 AND is_published = true', [id]);
    if (page.rows.length === 0) return res.status(404).json({ error: 'Page not found' });
    const result = await pool.query(
      'INSERT INTO custom_page_submissions (page_id, form_data) VALUES ($1,$2) RETURNING id',
      [id, JSON.stringify(form_data || {})]
    );
    const submissionId = result.rows[0].id;
    if (Array.isArray(files) && files.length > 0) {
      for (const f of files) {
        if (f.field_label && f.file_name && f.file_data) {
          await pool.query(
            'INSERT INTO custom_page_submission_files (submission_id, field_label, file_name, file_data) VALUES ($1,$2,$3,$4)',
            [submissionId, f.field_label, f.file_name, f.file_data]
          );
        }
      }
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit form' });
  }
});

export default router;
