// routes/auth.js — تسجيل المريض وتسجيل الدخول
const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { get, run } = require('../database');
const { JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const DOCTOR_EMAILS = (process.env.DOCTOR_EMAILS || 'doctor@clinic.com')
  .split(',').map(e => e.trim().toLowerCase());

function isValidPhone(phone) {
  // 11 رقم بالضبط (أرقام فقط بعد حذف المسافات والشرطات)
  return /^[0-9]{11}$/.test(phone.replace(/[\s\-]/g, ''));
}

// ─── POST /api/auth/register ───────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { email, name, phone, password } = req.body;

    if (!email || !name || !phone || !password)
      return res.status(400).json({ error: 'جميع الحقول مطلوبة (الاسم، البريد، الهاتف، كلمة المرور)' });

    if (password.length < 4)
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 4 أحرف على الأقل' });

    const cleanPhone = phone.trim();
    if (!isValidPhone(cleanPhone))
      return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون 11 رقماً بالضبط' });

    const existing = get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing)
      return res.status(409).json({ error: 'البريد الإلكتروني مسجّل مسبقاً' });

    const role = DOCTOR_EMAILS.includes(email.toLowerCase()) ? 'doctor' : 'patient';
    const hash = await bcrypt.hash(password, 12);

    run(
      'INSERT INTO users (email, name, phone, password, role) VALUES (?, ?, ?, ?, ?)',
      [email.toLowerCase(), name, cleanPhone, hash, role]
    );

    const user = get('SELECT id, email, name, phone, role FROM users WHERE email = ?', [email.toLowerCase()]);
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── POST /api/auth/login ──────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ error: 'البريد الإلكتروني أو رقم الهاتف وكلمة المرور مطلوبان' });

    const input = identifier.trim();

    // تحديد نوع المدخل: رقم هاتف (11 رقم) أم بريد إلكتروني
    const isPhone = /^[0-9]{11}$/.test(input);
    let user;
    if (isPhone) {
      user = get('SELECT * FROM users WHERE phone = ?', [input]);
    } else {
      user = get('SELECT * FROM users WHERE email = ?', [input.toLowerCase()]);
    }

    if (!user)
      return res.status(401).json({ error: 'البيانات المدخلة أو كلمة المرور غير صحيحة' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(401).json({ error: 'البيانات المدخلة أو كلمة المرور غير صحيحة' });

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, phone: user.phone, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'خطأ في الخادم' });
  }
});

// ─── GET /api/auth/me ──────────────────────────────────────────────────────
const { authMiddleware } = require('../middleware/auth');
router.get('/me', authMiddleware, (req, res) => {
  const fresh = get('SELECT id, email, name, phone, role FROM users WHERE email = ?', [req.user.email]);
  res.json({ user: fresh || req.user });
});

module.exports = router;
