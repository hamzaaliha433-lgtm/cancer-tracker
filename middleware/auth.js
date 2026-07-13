// middleware/auth.js — JWT verification middleware
const jwt = require('jsonwebtoken');
const { get } = require('../database');

const JWT_SECRET = process.env.JWT_SECRET || 'CHANGE_THIS_SECRET_IN_PRODUCTION';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح — يرجى تسجيل الدخول' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, name, role }
    next();
  } catch (err) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً' });
  }
}

function doctorOnly(req, res, next) {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ error: 'هذه العملية مخصصة للطبيب فقط' });
  }
  next();
}

function patientOnly(req, res, next) {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ error: 'هذه العملية مخصصة للمريض فقط' });
  }
  next();
}

module.exports = { authMiddleware, doctorOnly, patientOnly, JWT_SECRET };
