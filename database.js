// database.js — SQLite via sql.js (pure JS, no compilation needed)
// For production: replace with better-sqlite3 or PostgreSQL
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'tracker.db');

let db = null;

// Save DB to disk every time we write
function persist() {
  const data = db.export();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      email                 TEXT    UNIQUE NOT NULL,
      name                  TEXT    NOT NULL,
      phone                 TEXT,
      password              TEXT    NOT NULL,
      role                  TEXT    NOT NULL DEFAULT 'patient',
      assigned_doctor_email TEXT,
      created_at            TEXT    DEFAULT (date('now'))
    );
  `);

  // Migration: add phone column if upgrading from older database
  try { db.run('ALTER TABLE users ADD COLUMN phone TEXT;'); } catch (e) { /* already exists */ }
  // Migration: add doctor-assignment column if upgrading from older database
  try { db.run('ALTER TABLE users ADD COLUMN assigned_doctor_email TEXT;'); } catch (e) { /* already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS reports (
      id           TEXT PRIMARY KEY,
      patient_email TEXT NOT NULL,
      title        TEXT NOT NULL,
      date         TEXT NOT NULL,
      note         TEXT,
      img          TEXT,
      report_type  TEXT DEFAULT 'other',
      created_at   TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  // Migration: add report_type column if upgrading from older database
  try { db.run("ALTER TABLE reports ADD COLUMN report_type TEXT DEFAULT 'other';"); } catch (e) { /* already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS vitals (
      id            TEXT PRIMARY KEY,
      patient_email TEXT NOT NULL,
      date          TEXT NOT NULL,
      sugar         TEXT,
      sys           TEXT,
      dia           TEXT,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS condition_notes (
      id            TEXT PRIMARY KEY,
      patient_email TEXT NOT NULL,
      date          TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'stable',
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS condition_profile (
      patient_email  TEXT PRIMARY KEY,
      cancer_type    TEXT,
      discovery_date TEXT,
      disease_status TEXT DEFAULT 'ongoing',
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS medications (
      id            TEXT PRIMARY KEY,
      patient_email TEXT NOT NULL,
      name          TEXT NOT NULL,
      dose          TEXT,
      from_date     TEXT,
      to_date       TEXT,
      ongoing       INTEGER DEFAULT 0,
      note          TEXT,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS wellness (
      id            TEXT PRIMARY KEY,
      patient_email TEXT NOT NULL,
      date          TEXT NOT NULL,
      appetite      TEXT NOT NULL DEFAULT 'normal',
      strength      TEXT NOT NULL DEFAULT 'normal',
      vomiting      TEXT NOT NULL DEFAULT 'no',
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  // Migration: add vomiting column if upgrading from older database
  try { db.run("ALTER TABLE wellness ADD COLUMN vomiting TEXT NOT NULL DEFAULT 'no';"); } catch (e) { /* already exists */ }

  db.run(`
    CREATE TABLE IF NOT EXISTS instructions (
      id            TEXT PRIMARY KEY,
      patient_email TEXT NOT NULL,
      text          TEXT NOT NULL,
      date          TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (patient_email) REFERENCES users(email)
    );
  `);

  persist();
  console.log('✅ Database initialized');
  return db;
}

// Helper wrappers that mirror better-sqlite3 API
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function run(sql, params = []) {
  db.run(sql, params);
  persist();
}

function get(sql, params = []) {
  const rows = query(sql, params);
  return rows[0] || null;
}

module.exports = { initDB, query, run, get, persist };
