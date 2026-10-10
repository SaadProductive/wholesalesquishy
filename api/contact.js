// Contact / quote form -> email to your Gmail (via Gmail SMTP + app password).
// Vercel env vars: GMAIL_USER (the Gmail address that sends), GMAIL_APP_PASSWORD (16-char Google app password),
//                  CONTACT_TO (where messages land; can be the same Gmail).
const nodemailer = require('nodemailer');

const clean = (v, max) => String(v == null ? '' : v).replace(/\r/g, '').trim().slice(0, max);
const bad = (v) => /[\r\n]/.test(v);

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  b = b || {};
  if (b.website) { res.status(200).json({ ok: true }); return; }          // honeypot: bots fill this, humans don't see it

  const name = clean(b.name, 120), email = clean(b.email, 200), subject = clean(b.subject, 200), message = clean(b.message, 5000);
  if (!name || !email || !subject || !message) { res.status(400).json({ error: 'Please fill in every field.' }); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || bad(email) || bad(name) || bad(subject)) { res.status(400).json({ error: 'Please check your email address.' }); return; }

  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD, to = process.env.CONTACT_TO || user;
  if (!user || !pass || !to) { res.status(500).json({ error: 'Contact form is not configured.' }); return; }

  try {
    const tx = nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
    await tx.sendMail({
      from: `"Wholesale Squishy site" <${user}>`,
      to,
      replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
      subject: `[Website] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}\n`
    });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Contact mail failed:', err && err.message);
    res.status(500).json({ error: 'Could not send right now.' });
  }
};
