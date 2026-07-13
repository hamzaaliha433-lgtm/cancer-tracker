// routes/doctor.js — واجهة الطبيب (قراءة فقط + إرسال تعليمات)
const express = require('express');
const { query, run, get } = require('../database');
const { authMiddleware, doctorOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware, doctorOnly);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ─── GET /api/doctor/patients ──────────────────────────────────────────────
// قائمة جميع المرضى مع آخر حالة لكل منهم
router.get('/patients', (req, res) => {
  const patients = query(
    "SELECT id, email, name, phone, created_at FROM users WHERE role = 'patient' ORDER BY name"
  );

  const result = patients.map(p => {
    const lastNote = get(
      'SELECT status, date FROM condition_notes WHERE patient_email = ? ORDER BY date DESC LIMIT 1',
      [p.email]
    );
    const profile = get(
      'SELECT cancer_type, disease_status FROM condition_profile WHERE patient_email = ?',
      [p.email]
    );
    return {
      ...p,
      last_status: lastNote?.status || null,
      last_status_date: lastNote?.date || null,
      cancer_type: profile?.cancer_type || null,
      disease_status: profile?.disease_status || null,
    };
  });

  res.json(result);
});

// ─── GET /api/doctor/patients/:email ──────────────────────────────────────
// بيانات مريض محدد (كاملة — قراءة فقط)
router.get('/patients/:email', (req, res) => {
  const patient = get(
    "SELECT id, email, name, phone, created_at FROM users WHERE email = ? AND role = 'patient'",
    [req.params.email.toLowerCase()]
  );
  if (!patient) return res.status(404).json({ error: 'المريض غير موجود' });
  res.json(patient);
});

router.get('/patients/:email/reports', (req, res) => {
  const rows = query(
    'SELECT id, title, date, note, img FROM reports WHERE patient_email = ? ORDER BY date DESC',
    [req.params.email.toLowerCase()]
  );
  res.json(rows);
});

router.get('/patients/:email/vitals', (req, res) => {
  const rows = query(
    'SELECT * FROM vitals WHERE patient_email = ? ORDER BY date DESC',
    [req.params.email.toLowerCase()]
  );
  res.json(rows);
});

router.get('/patients/:email/notes', (req, res) => {
  const rows = query(
    'SELECT * FROM condition_notes WHERE patient_email = ? ORDER BY date DESC',
    [req.params.email.toLowerCase()]
  );
  res.json(rows);
});

router.get('/patients/:email/condition-profile', (req, res) => {
  const row = get(
    'SELECT * FROM condition_profile WHERE patient_email = ?',
    [req.params.email.toLowerCase()]
  );
  res.json(row || { cancer_type: '', discovery_date: '', disease_status: 'ongoing' });
});

router.get('/patients/:email/medications', (req, res) => {
  const rows = query(
    'SELECT * FROM medications WHERE patient_email = ? ORDER BY from_date DESC',
    [req.params.email.toLowerCase()]
  );
  res.json(rows.map(r => ({ ...r, ongoing: r.ongoing === 1 || r.ongoing === '1' })));
});

router.get('/patients/:email/instructions', (req, res) => {
  const rows = query(
    'SELECT * FROM instructions WHERE patient_email = ? ORDER BY date DESC',
    [req.params.email.toLowerCase()]
  );
  res.json(rows);
});

// ─── POST /api/doctor/patients/:email/instructions ─────────────────────────
// الطبيب يرسل تعليمات للمريض
router.post('/patients/:email/instructions', (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim())
    return res.status(400).json({ error: 'نص التعليمات مطلوب' });

  const patient = get(
    "SELECT email FROM users WHERE email = ? AND role = 'patient'",
    [req.params.email.toLowerCase()]
  );
  if (!patient) return res.status(404).json({ error: 'المريض غير موجود' });

  const id = uid();
  run(
    'INSERT INTO instructions (id, patient_email, text, date) VALUES (?,?,?,?)',
    [id, patient.email, text.trim(), today()]
  );

  res.json(get('SELECT * FROM instructions WHERE id = ?', [id]));
});

// ─── GET /api/doctor/stats ─────────────────────────────────────────────────
// إحصائيات عامة للطبيب
router.get('/stats', (req, res) => {
  const total   = get("SELECT COUNT(*) as c FROM users WHERE role = 'patient'")?.c || 0;
  const critical = get("SELECT COUNT(DISTINCT patient_email) as c FROM condition_notes cn1 WHERE status = 'critical' AND date = (SELECT MAX(date) FROM condition_notes cn2 WHERE cn2.patient_email = cn1.patient_email)")?.c || 0;
  const ongoing  = get("SELECT COUNT(*) as c FROM condition_profile WHERE disease_status = 'ongoing'")?.c || 0;
  const ended    = get("SELECT COUNT(*) as c FROM condition_profile WHERE disease_status = 'ended'")?.c || 0;

  res.json({ total_patients: total, critical, disease_ongoing: ongoing, disease_ended: ended });
});

module.exports = router;
