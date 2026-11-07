'use strict';
// doc_api — Advanced I/O function for notes.onslate.in
// Routes: /me, /login-event, /heartbeat, /attachments (GET/POST/DELETE),
//         /attachments/:id/download, /stats, /cleanup
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();
const BUCKET = 'doc-attachments';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_EXT = ['pdf', 'png', 'jpg', 'jpeg', 'txt', 'md', 'zip', 'docx'];
const RETENTION_DAYS = 90;
const ADMIN_ROLE = 'App Administrator';
// CORS is handled by the Catalyst gateway (project CORS domains: notes.onslate.in).
// Do NOT set Access-Control-* headers here — duplicates break the browser origin check.
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// ── helpers ──────────────────────────────────────────────
const pad = n => String(n).padStart(2, '0');
const fmtDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtDateTime = d => `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
const esc = s => String(s).replace(/'/g, "''");
const PAGE_RE = /^[a-z0-9-]{1,80}$/;
const KEY_RE = /^[A-Za-z0-9-]{8,64}$/;

/** Attach catalyst app + authenticated user; reject anonymous requests. */
async function requireUser(req, res, next) {
  try {
    req.cat = catalyst.initialize(req);
    const user = await req.cat.userManagement().getCurrentUser();
    if (!user || !user.user_id) return res.status(401).json({ error: 'Not signed in' });
    req.user = user;
    req.isAdmin = (user.role_details && user.role_details.role_name) === ADMIN_ROLE;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Not signed in' });
  }
}
const requireAdmin = (req, res, next) =>
  req.isAdmin ? next() : res.status(403).json({ error: 'Admin only' });

const query = (req, sql) => req.cat.zcql().executeZCQLQuery(sql);
const table = (req, name) => req.cat.datastore().table(name);

app.use(requireUser);

// ── who am I ─────────────────────────────────────────────
app.get('/me', (req, res) => {
  const u = req.user;
  res.json({ user_id: u.user_id, email: u.email_id, name: `${u.first_name || ''} ${u.last_name || ''}`.trim(), isAdmin: req.isAdmin });
});

// ── daily login (one row per user per day) ───────────────
app.post('/login-event', express.json(), async (req, res) => {
  try {
    const now = new Date();
    const today = fmtDate(now);
    const uid = esc(req.user.user_id);
    const rows = await query(req, `SELECT ROWID FROM LoginLog WHERE user_id = '${uid}' AND login_date = '${today}'`);
    if (!rows.length) {
      await table(req, 'LoginLog').insertRow({
        user_id: req.user.user_id,
        email: req.user.email_id,
        login_date: today,
        login_time: fmtDateTime(now),
        user_agent: String(req.headers['user-agent'] || '').slice(0, 500),
        ip: String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().slice(0, 64),
      });
    }
    res.json({ ok: true, firstToday: !rows.length });
  } catch (e) { res.status(500).json({ error: 'login-event failed' }); }
});

// ── time used (visible-tab seconds per page view) ────────
app.post('/heartbeat', express.json(), async (req, res) => {
  try {
    const { page, sessionKey, activeSeconds } = req.body || {};
    if (!PAGE_RE.test(page || '') || !KEY_RE.test(sessionKey || '')) return res.status(400).json({ error: 'bad input' });
    const secs = Math.max(0, Math.min(Number(activeSeconds) || 0, 86400));
    const now = fmtDateTime(new Date());
    const rows = await query(req, `SELECT ROWID, user_id FROM PageSession WHERE session_key = '${esc(sessionKey)}'`);
    if (rows.length) {
      const r = rows[0].PageSession;
      if (r.user_id !== req.user.user_id) return res.status(403).json({ error: 'forbidden' });
      await table(req, 'PageSession').updateRow({ ROWID: r.ROWID, end_time: now, active_seconds: secs });
    } else {
      await table(req, 'PageSession').insertRow({
        user_id: req.user.user_id, page, session_key: sessionKey, start_time: now, end_time: now, active_seconds: secs,
      });
    }
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'heartbeat failed' }); }
});

// ── attachments ──────────────────────────────────────────
app.get('/attachments', async (req, res) => {
  try {
    const page = String(req.query.page || '');
    if (!PAGE_RE.test(page) || page.startsWith('u-')) return res.status(400).json({ error: 'bad page' });
    const rows = await query(req, `SELECT ROWID, file_name, size, uploaded_by, CREATEDTIME FROM Attachment WHERE page = '${page}' ORDER BY CREATEDTIME DESC`);
    res.json({ canUpload: req.isAdmin, items: rows.map(r => r.Attachment) });
  } catch (e) { res.status(500).json({ error: 'list failed' }); }
});

app.post('/attachments', requireAdmin, express.raw({ type: '*/*', limit: MAX_BYTES }), async (req, res) => {
  try {
    const page = String(req.headers['x-page'] || '');
    const rawName = decodeURIComponent(String(req.headers['x-file-name'] || ''));
    const fileName = rawName.replace(/[^\w.\- ]/g, '_').slice(0, 200);
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (!PAGE_RE.test(page)) return res.status(400).json({ error: 'bad page' });
    if (!fileName || !ALLOWED_EXT.includes(ext)) return res.status(400).json({ error: `Allowed: ${ALLOWED_EXT.join(', ')}` });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'empty file' });

    const objectKey = `attachments/${page}/${Date.now()}-${fileName}`;
    await req.cat.stratus().bucket(BUCKET).putObject(objectKey, req.body);
    const row = await table(req, 'Attachment').insertRow({
      page, file_name: fileName, object_key: objectKey, size: req.body.length, uploaded_by: req.user.email_id,
    });
    res.json({ ok: true, id: row.ROWID });
  } catch (e) { res.status(500).json({ error: 'upload failed' }); }
});

app.get('/attachments/:id/download', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'bad id' });
    const row = await table(req, 'Attachment').getRow(req.params.id);
    // personal files (u-<uid>) are visible only to their owner
    if (String(row.page).startsWith('u-') && row.page !== myPage(req)) return res.status(404).json({ error: 'not found' });
    const signed = await req.cat.stratus().bucket(BUCKET).generatePreSignedUrl(row.object_key, 'GET', { expiryIn: 300 });
    res.json({ url: signed.signature || signed.url || signed, fileName: row.file_name });
  } catch (e) { res.status(404).json({ error: 'not found' }); }
});

app.delete('/attachments/:id', requireAdmin, async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'bad id' });
    const row = await table(req, 'Attachment').getRow(req.params.id);
    await req.cat.stratus().bucket(BUCKET).deleteObject(row.object_key);
    await table(req, 'Attachment').deleteRow(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: 'delete failed' }); }
});

// ── my account: profile + daily logins + time used ───────
app.get('/account', async (req, res) => {
  try {
    const u = req.user;
    const uid = esc(u.user_id);
    const since = fmtDate(new Date(Date.now() - 30 * 864e5));
    const [logins, perDay, perPage, total] = await Promise.all([
      query(req, `SELECT login_date, login_time, ip, user_agent FROM LoginLog WHERE user_id = '${uid}' ORDER BY login_time DESC LIMIT 30`),
      query(req, `SELECT start_time, active_seconds FROM PageSession WHERE user_id = '${uid}' AND start_time >= '${since} 00:00:00' LIMIT 300`),
      query(req, `SELECT page, SUM(active_seconds), COUNT(ROWID) FROM PageSession WHERE user_id = '${uid}' GROUP BY page`),
      query(req, `SELECT COUNT(ROWID) FROM LoginLog WHERE user_id = '${uid}'`),
    ]);
    const days = {};
    perDay.forEach(r => { const d = String(r.PageSession.start_time).slice(0, 10); days[d] = (days[d] || 0) + Number(r.PageSession.active_seconds || 0); });
    res.json({
      profile: {
        user_id: u.user_id, email: u.email_id, first_name: u.first_name || '', last_name: u.last_name || '',
        role: (u.role_details && u.role_details.role_name) || '', status: u.status || '',
        confirmed: !!u.is_confirmed, created: u.created_time || '', org_id: u.org_id || '',
        timezone: u.time_zone || '', locale: u.locale || '',
      },
      totalLoginDays: Number((total[0] && (total[0].LoginLog || {})['COUNT(ROWID)']) || 0),
      logins: logins.map(r => r.LoginLog),
      timePerDay: Object.entries(days).sort((a, b) => b[0].localeCompare(a[0])).map(([date, seconds]) => ({ date, seconds })),
      timePerPage: perPage.map(r => r.PageSession),
    });
  } catch (e) { res.status(500).json({ error: 'account failed' }); }
});

// ── my files: private per-user uploads (any signed-in user) ──
const myPage = req => `u-${String(req.user.user_id).replace(/[^0-9a-z]/gi, '')}`;
app.get('/my-files', async (req, res) => {
  try {
    const rows = await query(req, `SELECT ROWID, file_name, size, CREATEDTIME FROM Attachment WHERE page = '${myPage(req)}' ORDER BY CREATEDTIME DESC`);
    res.json({ items: rows.map(r => r.Attachment) });
  } catch (e) { res.status(500).json({ error: 'list failed' }); }
});
app.post('/my-files', express.raw({ type: '*/*', limit: MAX_BYTES }), async (req, res) => {
  try {
    const fileName = decodeURIComponent(String(req.headers['x-file-name'] || '')).replace(/[^\w.\- ]/g, '_').slice(0, 200);
    const ext = (fileName.split('.').pop() || '').toLowerCase();
    if (!fileName || !ALLOWED_EXT.includes(ext)) return res.status(400).json({ error: `Allowed: ${ALLOWED_EXT.join(', ')}` });
    if (!Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'empty file' });
    const page = myPage(req);
    const objectKey = `users/${page}/${Date.now()}-${fileName}`;
    await req.cat.stratus().bucket(BUCKET).putObject(objectKey, req.body);
    const row = await table(req, 'Attachment').insertRow({ page, file_name: fileName, object_key: objectKey, size: req.body.length, uploaded_by: req.user.email_id });
    res.json({ ok: true, id: row.ROWID });
  } catch (e) { res.status(500).json({ error: 'upload failed' }); }
});
app.delete('/my-files/:id', async (req, res) => {
  try {
    if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ error: 'bad id' });
    const row = await table(req, 'Attachment').getRow(req.params.id);
    if (row.page !== myPage(req)) return res.status(404).json({ error: 'not found' });
    await req.cat.stratus().bucket(BUCKET).deleteObject(row.object_key);
    await table(req, 'Attachment').deleteRow(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(404).json({ error: 'not found' }); }
});

// ── admin stats ──────────────────────────────────────────
app.get('/stats', requireAdmin, async (req, res) => {
  try {
    const days = Math.max(1, Math.min(Number(req.query.days) || 30, RETENTION_DAYS));
    const since = new Date(Date.now() - days * 864e5);
    const [logins, perUser, perPage, recent] = await Promise.all([
      query(req, `SELECT login_date, COUNT(ROWID) FROM LoginLog WHERE login_date >= '${fmtDate(since)}' GROUP BY login_date ORDER BY login_date DESC`),
      query(req, `SELECT user_id, SUM(active_seconds) FROM PageSession WHERE start_time >= '${fmtDateTime(since)}' GROUP BY user_id`),
      query(req, `SELECT page, SUM(active_seconds), COUNT(ROWID) FROM PageSession WHERE start_time >= '${fmtDateTime(since)}' GROUP BY page`),
      query(req, `SELECT email, login_date, login_time, ip, user_agent FROM LoginLog ORDER BY login_time DESC LIMIT 50`),
    ]);
    res.json({ days, logins, perUser, perPage, recent });
  } catch (e) { res.status(500).json({ error: 'stats failed' }); }
});

// ── retention: delete tracking rows older than 90 days ───
app.post('/cleanup', requireAdmin, async (req, res) => {
  try {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 864e5);
    await query(req, `DELETE FROM LoginLog WHERE login_date < '${fmtDate(cutoff)}'`);
    await query(req, `DELETE FROM PageSession WHERE start_time < '${fmtDateTime(cutoff)}'`);
    res.json({ ok: true, cutoff: fmtDate(cutoff) });
  } catch (e) { res.status(500).json({ error: 'cleanup failed' }); }
});

module.exports = app;
