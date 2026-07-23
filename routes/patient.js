// routes/patient.js — بيانات المريض الكاملة (تقارير، قراءات، ملاحظات، أدوية)
const express = require('express');
const { query, run, get } = require('../database');
const { authMiddleware, patientOnly } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
function today() {
  return new Date().toISOString().slice(0, 10);
}

// ═══════════════════════════════════════════════
// REPORTS  /api/patient/reports
// ═══════════════════════════════════════════════
router.get('/reports', (req, res) => {
  const rows = query(
    'SELECT * FROM reports WHERE patient_email = ? ORDER BY date DESC',
    [req.user.email]
  );
  res.json(rows);
});

router.post('/reports', patientOnly, (req, res) => {
  const { title, date, note, img } = req.body;
  if (!title) return res.status(400).json({ error: 'عنوان التقرير مطلوب' });

  // Limit image size: 2MB base64 max
  if (img && img.length > 2 * 1024 * 1024 * 1.37) {
    return res.status(400).json({ error: 'حجم الصورة كبير جداً (الحد الأقصى 2MB)' });
  }

  const id = uid();
  run(
    'INSERT INTO reports (id, patient_email, title, date, note, img) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.user.email, title, date || today(), note || '', img || null]
  );
  res.json(get('SELECT * FROM reports WHERE id = ?', [id]));
});

router.put('/reports/:id', patientOnly, (req, res) => {
  const report = get('SELECT * FROM reports WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!report) return res.status(404).json({ error: 'التقرير غير موجود' });

  const { title, date, note, img } = req.body;
  run(
    'UPDATE reports SET title=?, date=?, note=?, img=? WHERE id=?',
    [title ?? report.title, date ?? report.date, note ?? report.note, img !== undefined ? img : report.img, req.params.id]
  );
  res.json(get('SELECT * FROM reports WHERE id = ?', [req.params.id]));
});

router.delete('/reports/:id', patientOnly, (req, res) => {
  const report = get('SELECT id FROM reports WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!report) return res.status(404).json({ error: 'التقرير غير موجود' });
  run('DELETE FROM reports WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// VITALS  /api/patient/vitals
// ═══════════════════════════════════════════════
router.get('/vitals', (req, res) => {
  const rows = query(
    'SELECT * FROM vitals WHERE patient_email = ? ORDER BY date DESC',
    [req.user.email]
  );
  res.json(rows);
});

router.post('/vitals', patientOnly, (req, res) => {
  const { date, sugar, sys, dia, note } = req.body;
  if (!sugar && !sys && !dia)
    return res.status(400).json({ error: 'أدخل قيمة واحدة على الأقل' });

  const id = uid();
  run(
    'INSERT INTO vitals (id, patient_email, date, sugar, sys, dia, note) VALUES (?,?,?,?,?,?,?)',
    [id, req.user.email, date || today(), sugar || '', sys || '', dia || '', note || '']
  );
  res.json(get('SELECT * FROM vitals WHERE id = ?', [id]));
});

router.put('/vitals/:id', patientOnly, (req, res) => {
  const row = get('SELECT * FROM vitals WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'القراءة غير موجودة' });

  const { date, sugar, sys, dia, note } = req.body;
  run(
    'UPDATE vitals SET date=?, sugar=?, sys=?, dia=?, note=? WHERE id=?',
    [date ?? row.date, sugar ?? row.sugar, sys ?? row.sys, dia ?? row.dia, note ?? row.note, req.params.id]
  );
  res.json(get('SELECT * FROM vitals WHERE id = ?', [req.params.id]));
});

router.delete('/vitals/:id', patientOnly, (req, res) => {
  const row = get('SELECT id FROM vitals WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'القراءة غير موجودة' });
  run('DELETE FROM vitals WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// CONDITION NOTES  /api/patient/notes
// ═══════════════════════════════════════════════
router.get('/notes', (req, res) => {
  const rows = query(
    'SELECT * FROM condition_notes WHERE patient_email = ? ORDER BY date DESC',
    [req.user.email]
  );
  res.json(rows);
});

router.post('/notes', patientOnly, (req, res) => {
  const { date, status, note } = req.body;
  if (!note) return res.status(400).json({ error: 'الملاحظة مطلوبة' });

  const id = uid();
  run(
    'INSERT INTO condition_notes (id, patient_email, date, status, note) VALUES (?,?,?,?,?)',
    [id, req.user.email, date || today(), status || 'stable', note]
  );
  res.json(get('SELECT * FROM condition_notes WHERE id = ?', [id]));
});

router.put('/notes/:id', patientOnly, (req, res) => {
  const row = get('SELECT * FROM condition_notes WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'الملاحظة غير موجودة' });

  const { date, status, note } = req.body;
  run(
    'UPDATE condition_notes SET date=?, status=?, note=? WHERE id=?',
    [date ?? row.date, status ?? row.status, note ?? row.note, req.params.id]
  );
  res.json(get('SELECT * FROM condition_notes WHERE id = ?', [req.params.id]));
});

router.delete('/notes/:id', patientOnly, (req, res) => {
  const row = get('SELECT id FROM condition_notes WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'الملاحظة غير موجودة' });
  run('DELETE FROM condition_notes WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// CONDITION PROFILE  /api/patient/condition-profile
// ═══════════════════════════════════════════════
router.get('/condition-profile', (req, res) => {
  const row = get('SELECT * FROM condition_profile WHERE patient_email = ?', [req.user.email]);
  res.json(row || { patient_email: req.user.email, cancer_type: '', discovery_date: '', disease_status: 'ongoing' });
});

router.put('/condition-profile', patientOnly, (req, res) => {
  const { cancer_type, discovery_date, disease_status } = req.body;
  const existing = get('SELECT patient_email FROM condition_profile WHERE patient_email = ?', [req.user.email]);

  if (existing) {
    run(
      'UPDATE condition_profile SET cancer_type=?, discovery_date=?, disease_status=? WHERE patient_email=?',
      [cancer_type || '', discovery_date || '', disease_status || 'ongoing', req.user.email]
    );
  } else {
    run(
      'INSERT INTO condition_profile (patient_email, cancer_type, discovery_date, disease_status) VALUES (?,?,?,?)',
      [req.user.email, cancer_type || '', discovery_date || '', disease_status || 'ongoing']
    );
  }
  res.json(get('SELECT * FROM condition_profile WHERE patient_email = ?', [req.user.email]));
});

// ═══════════════════════════════════════════════
// WELLNESS (الشهية والقوة)  /api/patient/wellness
// ═══════════════════════════════════════════════
const VALID_APPETITE = ['normal', 'low'];
const VALID_STRENGTH = ['normal', 'bad'];
const VALID_VOMITING = ['yes', 'no'];

router.get('/wellness', (req, res) => {
  const rows = query(
    'SELECT * FROM wellness WHERE patient_email = ? ORDER BY date DESC',
    [req.user.email]
  );
  res.json(rows);
});

router.post('/wellness', patientOnly, (req, res) => {
  const { date, appetite, strength, vomiting } = req.body;
  if (!VALID_APPETITE.includes(appetite))
    return res.status(400).json({ error: 'قيمة الشهية غير صالحة' });
  if (!VALID_STRENGTH.includes(strength))
    return res.status(400).json({ error: 'قيمة القوة غير صالحة' });
  if (!VALID_VOMITING.includes(vomiting))
    return res.status(400).json({ error: 'قيمة التقيؤ غير صالحة' });

  const id = uid();
  run(
    'INSERT INTO wellness (id, patient_email, date, appetite, strength, vomiting) VALUES (?,?,?,?,?,?)',
    [id, req.user.email, date || today(), appetite, strength, vomiting]
  );
  res.json(get('SELECT * FROM wellness WHERE id = ?', [id]));
});

router.put('/wellness/:id', patientOnly, (req, res) => {
  const row = get('SELECT * FROM wellness WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'السجل غير موجود' });

  const { date, appetite, strength, vomiting } = req.body;
  if (appetite !== undefined && !VALID_APPETITE.includes(appetite))
    return res.status(400).json({ error: 'قيمة الشهية غير صالحة' });
  if (strength !== undefined && !VALID_STRENGTH.includes(strength))
    return res.status(400).json({ error: 'قيمة القوة غير صالحة' });
  if (vomiting !== undefined && !VALID_VOMITING.includes(vomiting))
    return res.status(400).json({ error: 'قيمة التقيؤ غير صالحة' });

  run(
    'UPDATE wellness SET date=?, appetite=?, strength=?, vomiting=? WHERE id=?',
    [date ?? row.date, appetite ?? row.appetite, strength ?? row.strength, vomiting ?? row.vomiting, req.params.id]
  );
  res.json(get('SELECT * FROM wellness WHERE id = ?', [req.params.id]));
});

router.delete('/wellness/:id', patientOnly, (req, res) => {
  const row = get('SELECT id FROM wellness WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'السجل غير موجود' });
  run('DELETE FROM wellness WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// MEDICATIONS  /api/patient/medications
// ═══════════════════════════════════════════════
router.get('/medications', (req, res) => {
  const rows = query(
    'SELECT * FROM medications WHERE patient_email = ? ORDER BY from_date DESC',
    [req.user.email]
  );
  res.json(rows.map(r => ({ ...r, ongoing: r.ongoing === 1 || r.ongoing === '1' })));
});

router.post('/medications', patientOnly, (req, res) => {
  const { name, dose, from_date, to_date, ongoing, note } = req.body;
  if (!name) return res.status(400).json({ error: 'اسم الدواء مطلوب' });

  const id = uid();
  run(
    'INSERT INTO medications (id, patient_email, name, dose, from_date, to_date, ongoing, note) VALUES (?,?,?,?,?,?,?,?)',
    [id, req.user.email, name, dose || '', from_date || today(), to_date || '', ongoing ? 1 : 0, note || '']
  );
  const row = get('SELECT * FROM medications WHERE id = ?', [id]);
  res.json({ ...row, ongoing: row.ongoing === 1 });
});

router.put('/medications/:id', patientOnly, (req, res) => {
  const row = get('SELECT * FROM medications WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'الدواء غير موجود' });

  const { name, dose, from_date, to_date, ongoing, note } = req.body;
  run(
    'UPDATE medications SET name=?, dose=?, from_date=?, to_date=?, ongoing=?, note=? WHERE id=?',
    [
      name ?? row.name, dose ?? row.dose, from_date ?? row.from_date,
      to_date ?? row.to_date, ongoing !== undefined ? (ongoing ? 1 : 0) : row.ongoing,
      note ?? row.note, req.params.id
    ]
  );
  const updated = get('SELECT * FROM medications WHERE id = ?', [req.params.id]);
  res.json({ ...updated, ongoing: updated.ongoing === 1 });
});

router.delete('/medications/:id', patientOnly, (req, res) => {
  const row = get('SELECT id FROM medications WHERE id = ? AND patient_email = ?', [req.params.id, req.user.email]);
  if (!row) return res.status(404).json({ error: 'الدواء غير موجود' });
  run('DELETE FROM medications WHERE id = ?', [req.params.id]);
  res.json({ success: true });
});

// ═══════════════════════════════════════════════
// INSTRUCTIONS  /api/patient/instructions
// ═══════════════════════════════════════════════
router.get('/instructions', (req, res) => {
  const rows = query(
    'SELECT * FROM instructions WHERE patient_email = ? ORDER BY date DESC',
    [req.user.email]
  );
  res.json(rows);
});

// ═══════════════════════════════════════════════
// MY DOCTOR  /api/patient/my-doctor
// ═══════════════════════════════════════════════
router.get('/my-doctor', (req, res) => {
  const me = get('SELECT assigned_doctor_email FROM users WHERE email = ?', [req.user.email]);
  if (!me || !me.assigned_doctor_email) return res.json(null);
  const doctor = get(
    "SELECT name, email FROM users WHERE email = ? AND role = 'doctor'",
    [me.assigned_doctor_email]
  );
  res.json(doctor || null);
});

router.put('/my-doctor', (req, res) => {
  const { doctor_email } = req.body;
  if (!doctor_email)
    return res.status(400).json({ error: 'الرجاء اختيار الطبيب' });

  const doctor = get(
    "SELECT email, name FROM users WHERE email = ? AND role = 'doctor'",
    [doctor_email.toLowerCase()]
  );
  if (!doctor)
    return res.status(400).json({ error: 'الطبيب المختار غير موجود — الرجاء الاختيار من القائمة' });

  run('UPDATE users SET assigned_doctor_email = ? WHERE email = ?', [doctor.email, req.user.email]);
  res.json(doctor);
});

module.exports = router;
