# Aimal.fi - Advisory Website

## Overview
A professional advisory website for Aimal.fi, a Helsinki-based consultancy offering Technology, Construction Planning, and Licensing Advisory services. Built with React, TypeScript, Vite, and Three.js for 3D visuals. Includes a secure admin panel with meeting booking system, contact messaging, and live market data.

## Project Architecture
- **Framework**: React 19 + TypeScript
- **Build Tool**: Vite 6
- **Styling**: Tailwind CSS (CDN), custom CSS
- **3D Graphics**: Three.js via @react-three/fiber and @react-three/drei
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Backend**: Express.js API server
- **Database**: PostgreSQL (bookings, admin auth, availability, settings, messages)
- **Email**: Nodemailer with ICS calendar attachments
- **Auth**: Session-based with bcrypt password hashing, auto-timeout
- **Market Data**: Yahoo Finance API for live stock/crypto prices

## Project Structure
```
/
├── index.html              # Entry HTML with SEO meta tags
├── index.tsx               # React entry point (LanguageProvider)
├── index.css               # Global styles
├── App.tsx                 # Main app (routing, views, booking, contact, stock ticker, splash)
├── translations.ts         # All website text in 14 languages
├── LanguageContext.tsx      # React context for language state
├── vite.config.ts          # Vite config (port 5000, API proxy to 3001)
├── server.js               # Production server (Express, serves dist + API + market data)
├── components/
│   ├── QuantumScene.tsx     # Three.js 3D scenes
│   ├── Diagrams.tsx         # SVG/visual diagrams
│   ├── BookingForm.tsx      # Meeting booking form with email validation
│   └── AdminPanel.tsx       # Admin panel (calendar, requests, messages, dashboard, settings)
├── server/
│   ├── dev.js              # Dev API server (port 3001)
│   ├── db.js               # PostgreSQL connection pool
│   ├── auth.js             # Admin login/logout/password routes
│   ├── bookings.js         # Booking CRUD, availability, approve/decline/cancel, CSV export
│   ├── settings.js         # Availability rules, blocked dates, email templates
│   ├── messages.js         # Contact messages CRUD, read status
│   └── email.js            # Email sending (confirmation, decline, cancellation) with ICS
└── package.json            # Dependencies and scripts
```

## Database Schema
- **admin_users**: Admin credentials (bcrypt hashed passwords)
- **bookings**: Meeting requests (name, email, phone, date, time, status, tags, notes)
- **availability_rules**: Working hours per day of week (open/close/lunch times)
- **blocked_dates**: Holidays and closed days
- **booking_settings**: Meeting duration, buffer time, same-day booking toggle
- **email_templates**: Confirmation, decline, and cancellation email templates
- **contact_messages**: User contact messages (name, email, phone, message, read status)
- **session**: Express session storage

## Admin Panel (/admin)
- **Login**: Default credentials set during DB init (changeable in Settings)
- **Calendar**: Monthly view with approved meetings
- **Requests**: View/approve/decline/cancel booking requests with tags and notes
- **Messages**: Chat-style UI showing contact form submissions with read/unread status
- **Today Jobs**: Live clock, today's schedule, search, PDF export
- **Dashboard**: Stats, approval rate, peak hours, CSV export
- **Settings**: Working hours, holidays, booking rules, email templates, password change
- Not publicly indexed (noindex meta tag)

## Booking System
- 30-minute meeting slots (configurable)
- 15-minute buffer between meetings (configurable)
- Prevents double booking of approved time slots (transactional)
- Same-day booking prevention (optional)
- Working hours and lunch break enforcement
- Email validation on booking form
- Source page tracking (which page user booked from)
- Admin can cancel approved meetings (sends cancellation email)

## Email System
- SMTP-based (requires SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM env vars)
- Confirmation emails with ICS calendar file attachment
- Decline emails with admin-written reason
- Cancellation emails when admin cancels approved meetings
- Editable templates with {first_name}, {date}, {time}, {reason} variables

## Frontend Features
- **Splash Animation**: Opening animation with profile photo (0.5s show, 0.5s fade)
- **Analog Clocks**: Minimal SVG wall clocks for NYC, Shanghai, London, Tokyo
- **Stock Ticker**: Live prices for S&P 500, NVIDIA, APPLE, Google, Meta, BTC, ETH
- **Contact Form**: Separate contact-only form for non-booking inquiries
- **Booking Form**: 2-step meeting booking with date/time selection

## Multi-Language Support
- **14 languages**: English (default), Finnish, Swedish, Russian, Estonian, Arabic, Somali, Persian, Kurdish, Chinese, Albanian, Thai, Turkish, Romanian
- **Implementation**: React Context with `useLanguage()` hook and `t(key)` function
- **Language selector**: Dropdown in header navigation

## Running
- **Dev**: `npm run dev` (Vite on port 5000 + API on port 3001)
- **Build**: `npm run build` (outputs to `dist/`)
- **Production**: `node server.js` (Express serves dist + API on port 5000)

## Recent Changes
- 2026-02-18: Bug fix: Fixed ESM crypto import crash in server files (require → import)
- 2026-02-18: Bug fix: Fixed PostgreSQL Date object handling in email ICS generation and admin calendar
- 2026-02-18: Bug fix: Fixed calendar date matching (ISO string normalization)
- 2026-02-18: Bug fix: Fixed CSV export date formatting
- 2026-02-18: Added meeting cancellation with email notification for approved bookings
- 2026-02-18: Added email validation to booking form
- 2026-02-18: Replaced WHO WE HELP photo with new provided image
- 2026-02-18: Replaced digital clocks with minimal analog SVG wall clocks
- 2026-02-18: Added opening splash animation with profile photo
- 2026-02-18: Added live stock/crypto ticker (S&P 500, NVIDIA, APPLE, Google, Meta, BTC, ETH)
- 2026-02-18: Added Contact Us form and Messages page in admin panel (chat-style UI)
- 2026-02-18: Added secure admin panel with booking system, calendar, dashboard, settings
- 2026-02-18: Added PostgreSQL database with booking/availability schema
- 2026-02-18: Added email system with ICS calendar file support
- 2026-02-18: Added comprehensive multi-language support with 14 languages
- 2026-02-17: Initial Replit setup
