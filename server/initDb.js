import pool from './db.js';

export async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bookings (
      id SERIAL PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      preferred_date DATE,
      preferred_time TIME,
      end_time TIME,
      message TEXT,
      source_page TEXT,
      status TEXT DEFAULT 'pending',
      decline_reason TEXT,
      private_notes TEXT,
      tags TEXT[],
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS availability_rules (
      id SERIAL PRIMARY KEY,
      day_of_week INT NOT NULL,
      is_working_day BOOLEAN NOT NULL DEFAULT false,
      open_time TEXT,
      close_time TEXT,
      lunch_start TEXT,
      lunch_end TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS booking_settings (
      setting_key TEXT PRIMARY KEY,
      setting_value TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS email_templates (
      template_type TEXT PRIMARY KEY,
      subject TEXT,
      body TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS contact_messages (
      id SERIAL PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      message TEXT,
      is_read BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS blocked_dates (
      blocked_date DATE PRIMARY KEY,
      reason TEXT
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(10, 2) DEFAULT 0,
      discount_percent NUMERIC(5, 2) DEFAULT 0,
      receipt_sentence TEXT DEFAULT '',
      sumup_checkout_url TEXT DEFAULT '',
      slug TEXT UNIQUE,
      show_in_header BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_images (
      id SERIAL PRIMARY KEY,
      product_id INT REFERENCES products(id) ON DELETE CASCADE,
      image_data TEXT NOT NULL,
      is_main BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_access_keys (
      id SERIAL PRIMARY KEY,
      product_id INT REFERENCES products(id) ON DELETE CASCADE,
      key_value TEXT NOT NULL,
      is_used BOOLEAN DEFAULT false,
      used_at TIMESTAMP,
      used_by_purchase_id INT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(product_id, key_value)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_purchases (
      id SERIAL PRIMARY KEY,
      product_id INT REFERENCES products(id) ON DELETE CASCADE,
      buyer_name TEXT,
      buyer_email TEXT,
      amount_paid NUMERIC(10, 2),
      status TEXT DEFAULT 'pending',
      sumup_checkout_ref TEXT,
      access_key_id INT,
      receipt_token TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`ALTER TABLE product_purchases ADD COLUMN IF NOT EXISTS receipt_token TEXT`);
  await pool.query(`ALTER TABLE product_purchases ADD COLUMN IF NOT EXISTS sumup_checkout_id TEXT`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_pages (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE,
      hero_label TEXT DEFAULT '',
      hero_title TEXT DEFAULT '',
      hero_subtitle TEXT DEFAULT '',
      left_panel_title TEXT DEFAULT '',
      left_panel_desc TEXT DEFAULT '',
      right_panel_title TEXT DEFAULT '',
      right_panel_desc TEXT DEFAULT '',
      is_published BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_page_images (
      id SERIAL PRIMARY KEY,
      page_id INT REFERENCES custom_pages(id) ON DELETE CASCADE,
      image_data TEXT NOT NULL,
      is_main BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_page_form_fields (
      id SERIAL PRIMARY KEY,
      page_id INT REFERENCES custom_pages(id) ON DELETE CASCADE,
      field_type TEXT NOT NULL,
      field_label TEXT NOT NULL,
      field_placeholder TEXT DEFAULT '',
      is_required BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_page_submissions (
      id SERIAL PRIMARY KEY,
      page_id INT REFERENCES custom_pages(id) ON DELETE CASCADE,
      form_data JSONB NOT NULL DEFAULT '{}',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS custom_page_submission_files (
      id SERIAL PRIMARY KEY,
      submission_id INT REFERENCES custom_page_submissions(id) ON DELETE CASCADE,
      field_label TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_data TEXT NOT NULL
    )
  `);

  await pool.query(`ALTER TABLE custom_page_submissions ADD COLUMN IF NOT EXISTS file_name TEXT`);
  await pool.query(`ALTER TABLE custom_page_submissions ADD COLUMN IF NOT EXISTS file_data TEXT`);
  await pool.query(`ALTER TABLE custom_page_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS investment_submissions (
      id SERIAL PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      phone TEXT,
      email TEXT,
      y_tunnus TEXT,
      role TEXT,
      message TEXT,
      status TEXT DEFAULT 'new',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`ALTER TABLE investment_submissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'new'`);

  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS is_out_of_stock BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS show_in_products_page BOOLEAN DEFAULT true`);
  await pool.query(`ALTER TABLE custom_pages ADD COLUMN IF NOT EXISTS show_in_header BOOLEAN DEFAULT false`);

  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS checkout_info_enabled BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS book_to_receive_enabled BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS book_to_receive_title TEXT DEFAULT ''`);
  await pool.query(`ALTER TABLE product_purchases ADD COLUMN IF NOT EXISTS checkout_info JSONB`);
  await pool.query(`ALTER TABLE product_purchases ADD COLUMN IF NOT EXISTS booked_slot TEXT`);
  await pool.query(`ALTER TABLE products ADD COLUMN IF NOT EXISTS book_to_receive_buffer_days INT DEFAULT 0`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS product_checkout_fields (
      id SERIAL PRIMARY KEY,
      product_id INT REFERENCES products(id) ON DELETE CASCADE,
      field_type TEXT NOT NULL DEFAULT 'text',
      field_label TEXT NOT NULL,
      field_placeholder TEXT DEFAULT '',
      is_required BOOLEAN DEFAULT true,
      sort_order INT DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS content_translations (
      id SERIAL PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id   INT  NOT NULL,
      language    TEXT NOT NULL,
      field_name  TEXT NOT NULL,
      translated_text TEXT NOT NULL,
      created_at  TIMESTAMP DEFAULT NOW(),
      UNIQUE(entity_type, entity_id, language, field_name)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      date TEXT DEFAULT '',
      time TEXT DEFAULT '',
      venue TEXT DEFAULT '',
      slug TEXT UNIQUE NOT NULL,
      bg_image TEXT DEFAULT '',
      text_bg_color TEXT DEFAULT '#000000',
      text_bg_opacity REAL DEFAULT 0.5,
      is_published BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_packages (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      sort_order INTEGER DEFAULT 0
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_purchases (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id),
      package_id INTEGER REFERENCES event_packages(id),
      package_name TEXT NOT NULL DEFAULT '',
      package_price NUMERIC(10,2) NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      amount_paid NUMERIC(10,2),
      buyer_name TEXT NOT NULL,
      buyer_email TEXT NOT NULL,
      buyer_phone TEXT NOT NULL DEFAULT '',
      buyer_note TEXT,
      status TEXT DEFAULT 'pending',
      receipt_token TEXT UNIQUE NOT NULL,
      sumup_checkout_id TEXT DEFAULT '',
      sumup_checkout_ref TEXT DEFAULT '',
      purchased_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_tickets (
      id SERIAL PRIMARY KEY,
      purchase_id INTEGER REFERENCES event_purchases(id) ON DELETE CASCADE,
      ticket_token TEXT UNIQUE NOT NULL,
      is_checked_in BOOLEAN DEFAULT false,
      checked_in_at TIMESTAMPTZ
    )
  `);

  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS show_in_header BOOLEAN DEFAULT false`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS bg_type TEXT DEFAULT 'image'`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS bg_video TEXT DEFAULT ''`);
  await pool.query(`ALTER TABLE event_packages ADD COLUMN IF NOT EXISTS payment_link TEXT DEFAULT ''`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS bar_host_pin TEXT DEFAULT ''`);
  await pool.query(`ALTER TABLE event_purchases ADD COLUMN IF NOT EXISTS buyer_note TEXT`);
  await pool.query(`ALTER TABLE events ADD COLUMN IF NOT EXISTS content_translations JSONB DEFAULT '{}'`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS bar_requests (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      table_number TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS event_images (
      id SERIAL PRIMARY KEY,
      event_id INTEGER REFERENCES events(id) ON DELETE CASCADE,
      image_data TEXT NOT NULL,
      sort_order INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  console.log('Database tables initialized');
}
