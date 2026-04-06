import nodemailer from 'nodemailer';
import pool from './db.js';

function toDateStr(d) {
  if (d instanceof Date) return d.toISOString().split('T')[0];
  if (typeof d === 'string' && d.includes('T')) return d.split('T')[0];
  return String(d);
}

function generateICS(booking) {
  const dateStr = toDateStr(booking.preferred_date);
  const date = dateStr.replace(/-/g, '');
  const startTime = booking.preferred_time.substring(0, 5).replace(':', '') + '00';
  const endTime = booking.end_time.substring(0, 5).replace(':', '') + '00';
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const uid = `booking-${booking.id}@aimal.fi`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Aimal.fi//Meeting//EN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART:${date}T${startTime}`,
    `DTEND:${date}T${endTime}`,
    'SUMMARY:Meeting with Aimal.fi Advisory',
    `DESCRIPTION:Meeting with ${booking.first_name} ${booking.last_name}`,
    'LOCATION:Helsinki, Finland',
    `ORGANIZER;CN=Aimal.fi Advisory:mailto:${process.env.SMTP_FROM || 'noreply@aimal.fi'}`,
    `ATTENDEE;CN=${booking.first_name} ${booking.last_name}:mailto:${booking.email}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

function replaceVars(template, booking) {
  const dateVal = booking.preferred_date instanceof Date ? booking.preferred_date : new Date(toDateStr(booking.preferred_date) + 'T00:00:00');
  const dateFormatted = dateVal.toLocaleDateString('en-GB', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const timeFormatted = booking.preferred_time?.substring(0, 5);

  return template
    .replace(/\{first_name\}/g, booking.first_name)
    .replace(/\{last_name\}/g, booking.last_name)
    .replace(/\{date\}/g, dateFormatted)
    .replace(/\{time\}/g, timeFormatted)
    .replace(/\{reason\}/g, booking.decline_reason || '');
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(port || '587'),
    secure: port === '465',
    auth: { user, pass },
  });
}

export async function sendConfirmationEmail(booking) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('SMTP not configured, skipping confirmation email for booking', booking.id);
    return false;
  }

  try {
    const templateResult = await pool.query("SELECT * FROM email_templates WHERE template_type = 'confirmation'");
    if (templateResult.rows.length === 0) return false;

    const template = templateResult.rows[0];
    const subject = replaceVars(template.subject, booking);
    const text = replaceVars(template.body, booking);
    const icsContent = generateICS(booking);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: booking.email,
      subject,
      text,
      icalEvent: {
        filename: 'meeting.ics',
        method: 'REQUEST',
        content: icsContent,
      },
    });

    console.log('Confirmation email sent to', booking.email);
    return true;
  } catch (err) {
    console.error('Failed to send confirmation email:', err.message);
    return false;
  }
}

export async function sendCancellationEmail(booking) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('SMTP not configured, skipping cancellation email for booking', booking.id);
    return false;
  }

  try {
    const templateResult = await pool.query("SELECT * FROM email_templates WHERE template_type = 'cancellation'");
    if (templateResult.rows.length === 0) return false;

    const template = templateResult.rows[0];
    const subject = replaceVars(template.subject, booking);
    const text = replaceVars(template.body, booking);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: booking.email,
      subject,
      text,
    });

    console.log('Cancellation email sent to', booking.email);
    return true;
  } catch (err) {
    console.error('Failed to send cancellation email:', err.message);
    return false;
  }
}

export async function sendDeclineEmail(booking) {
  const transporter = getTransporter();
  if (!transporter) {
    console.log('SMTP not configured, skipping decline email for booking', booking.id);
    return false;
  }

  try {
    const templateResult = await pool.query("SELECT * FROM email_templates WHERE template_type = 'decline'");
    if (templateResult.rows.length === 0) return false;

    const template = templateResult.rows[0];
    const subject = replaceVars(template.subject, booking);
    const text = replaceVars(template.body, booking);

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: booking.email,
      subject,
      text,
    });

    console.log('Decline email sent to', booking.email);
    return true;
  } catch (err) {
    console.error('Failed to send decline email:', err.message);
    return false;
  }
}
