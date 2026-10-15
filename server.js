// Minimal attendance server (Express + SQLite)
// Run: node server.js
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');
const cors = require('cors');

const DB_FILE = './attendance.db';
const APP_SECRET = process.env.APP_SECRET || '';

const db = new sqlite3.Database(DB_FILE);

// Create tables if they don't exist
const initSql = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_name TEXT,
  api_key TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  registration TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  device_id TEXT,
  qr_raw TEXT,
  status TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
`;

db.exec(initSql, (err) => {
  if (err) console.error('DB init error', err);
});

const app = express();
app.use(cors());
app.use(express.json());

function verifySignedPayload(payload) {
  if (!APP_SECRET) return false; // signature not enforced if no secret set
  if (!payload || !payload.registration || !payload.issued_at || !payload.sig) return false;
  const data = `${payload.registration}|${payload.issued_at}`;
  const expected = crypto.createHmac('sha256', APP_SECRET).update(data).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(payload.sig));
  } catch (e) {
    return false;
  }
}

// POST /attendance/checkin
// body: { qr: <string-or-object>, device_id: string }
app.post('/attendance/checkin', (req, res) => {
  const { qr, device_id } = req.body;
  if (!qr || !device_id) return res.status(400).json({ error: 'qr and device_id required' });

  let payload;
  try {
    payload = (typeof qr === 'string') ? JSON.parse(qr) : qr;
  } catch (e) {
    // if it's a bare string like registration no.
    payload = { registration: qr };
  }

  // Accept either plain registration or signed payload
  const registration = payload.registration || payload.reg || payload.student_id || payload.id;
  if (!registration) return res.status(400).json({ error: 'registration missing in qr' });

  const signedOk = verifySignedPayload(payload);
  const status = (APP_SECRET ? (signedOk ? 'ok' : 'unverified') : 'ok');

  const timestamp = new Date().toISOString();
  const sql = `INSERT INTO attendance(registration, timestamp, device_id, qr_raw, status) VALUES(?, ?, ?, ?, ?)`;
  db.run(sql, [registration, timestamp, device_id, JSON.stringify(payload), status], function (err) {
    if (err) {
      console.error('DB insert error', err);
      return res.status(500).json({ error: 'db error' });
    }
    res.json({ success: true, insertedId: this.lastID, registration, status, timestamp });
  });
});

// List recent check-ins
app.get('/attendance/recent', (req, res) => {
  db.all('SELECT * FROM attendance ORDER BY timestamp DESC LIMIT 50', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

// Simple endpoint to add a student (for prototype)
app.post('/students', (req, res) => {
  const { registration, name } = req.body;
  if (!registration) return res.status(400).json({ error: 'registration required' });
  db.run('INSERT OR IGNORE INTO students(registration, name) VALUES(?, ?)', [registration, name || null], function (err) {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json({ success: true, id: this.lastID });
  });
});

// Get students (simple)
app.get('/students', (req, res) => {
  db.all('SELECT * FROM students ORDER BY registration LIMIT 500', [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'db error' });
    res.json(rows);
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
