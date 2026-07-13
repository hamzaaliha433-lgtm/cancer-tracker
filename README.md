# 🏥 Cancer Patient Tracker — Backend API
### نظام متابعة مرضى السرطان — الخادم الخلفي

---

## 📁 هيكل المشروع

```
backend/
├── server.js                 ← الخادم الرئيسي (Entry Point)
├── database.js               ← قاعدة البيانات SQLite
├── package.json
├── .env                      ← متغيرات البيئة (لا ترفعه على GitHub!)
├── .env.example              ← نموذج الإعدادات
├── data/
│   └── tracker.db            ← ملف قاعدة البيانات (يُنشأ تلقائياً)
├── middleware/
│   └── auth.js               ← التحقق من هوية المستخدم (JWT)
└── routes/
    ├── auth.js               ← تسجيل / دخول
    ├── patient.js            ← بيانات المريض (CRUD كامل)
    └── doctor.js             ← واجهة الطبيب (قراءة + تعليمات)
```

---

## ⚡ التشغيل السريع (Development)

```bash
# 1. تثبيت المكتبات
npm install

# 2. إنشاء ملف الإعدادات
cp .env.example .env
# افتح .env وغيّر JWT_SECRET لقيمة عشوائية طويلة

# 3. تشغيل الخادم
npm start
# أو للتطوير (إعادة تشغيل تلقائية):
npm run dev

# الخادم يعمل على: http://localhost:3001
# Health check:      http://localhost:3001/api/health
```

---

## 🌐 API Reference

### Authentication
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/auth/register`  | تسجيل مريض جديد          |
| POST   | `/api/auth/login`     | تسجيل الدخول             |
| GET    | `/api/auth/me`        | معلومات المستخدم الحالي  |

**Register / Login body:**
```json
{ "email": "patient@example.com", "name": "اسم المريض", "password": "secret123" }
```

**Response:**
```json
{
  "token": "eyJhbG...",
  "user": { "id": 1, "email": "...", "name": "...", "role": "patient" }
}
```

> أرسل الـ token في كل طلب: `Authorization: Bearer <token>`

---

### Patient Endpoints (يتطلب تسجيل دخول كمريض)

| Method | Endpoint                         | Description          |
|--------|----------------------------------|----------------------|
| GET    | `/api/patient/reports`           | جلب التقارير         |
| POST   | `/api/patient/reports`           | إضافة تقرير          |
| PUT    | `/api/patient/reports/:id`       | تعديل تقرير          |
| DELETE | `/api/patient/reports/:id`       | حذف تقرير            |
| GET    | `/api/patient/vitals`            | جلب القراءات         |
| POST   | `/api/patient/vitals`            | إضافة قراءة          |
| PUT    | `/api/patient/vitals/:id`        | تعديل قراءة          |
| DELETE | `/api/patient/vitals/:id`        | حذف قراءة            |
| GET    | `/api/patient/notes`             | جلب الملاحظات        |
| POST   | `/api/patient/notes`             | إضافة ملاحظة         |
| PUT    | `/api/patient/notes/:id`         | تعديل ملاحظة         |
| DELETE | `/api/patient/notes/:id`         | حذف ملاحظة           |
| GET    | `/api/patient/condition-profile` | بيانات المرض         |
| PUT    | `/api/patient/condition-profile` | تحديث بيانات المرض   |
| GET    | `/api/patient/medications`       | جلب الأدوية          |
| POST   | `/api/patient/medications`       | إضافة دواء           |
| PUT    | `/api/patient/medications/:id`   | تعديل دواء           |
| DELETE | `/api/patient/medications/:id`   | حذف دواء             |
| GET    | `/api/patient/instructions`      | تعليمات الطبيب       |

---

### Doctor Endpoints (يتطلب تسجيل دخول كطبيب)

| Method | Endpoint                                   | Description                    |
|--------|--------------------------------------------|--------------------------------|
| GET    | `/api/doctor/patients`                     | قائمة المرضى + آخر حالة لكل منهم |
| GET    | `/api/doctor/stats`                        | إحصائيات عامة                  |
| GET    | `/api/doctor/patients/:email`              | بيانات مريض محدد               |
| GET    | `/api/doctor/patients/:email/reports`      | تقاريره                        |
| GET    | `/api/doctor/patients/:email/vitals`       | قراءاته                        |
| GET    | `/api/doctor/patients/:email/notes`        | ملاحظاته                       |
| GET    | `/api/doctor/patients/:email/medications`  | أدويته                         |
| POST   | `/api/doctor/patients/:email/instructions` | إرسال تعليمات للمريض           |

---

## 🚀 النشر على الإنترنت (Production Deployment)

### الخيار 1: Railway (الأسرع، مجاني للبداية)
```bash
# 1. سجّل على railway.app
# 2. ارفع المشروع على GitHub
# 3. اربطه بـ Railway — يعمل تلقائياً
# 4. أضف متغيرات البيئة من لوحة التحكم
```

### الخيار 2: VPS (DigitalOcean / Linode / Hostinger)
```bash
# على الخادم:
git clone <your-repo>
cd backend
npm install --production

# تثبيت PM2 لتشغيل الخادم دائماً
npm install -g pm2
pm2 start server.js --name "cancer-tracker"
pm2 startup
pm2 save

# nginx reverse proxy (اختياري لـ HTTPS)
# إضافة SSL مجاني عبر Certbot (Let's Encrypt)
```

### الخيار 3: للمستقبل — قاعدة بيانات أقوى
```
SQLite  ← ما نستخدمه الآن (ممتاز لـ 1000 مريض أو أقل)
PostgreSQL ← للنمو الكبير (آلاف المرضى، عيادات متعددة)
```

---

## 🔒 الأمان المُطبَّق

- ✅ كلمات المرور مشفّرة بـ `bcrypt` (salt rounds: 12)
- ✅ JWT tokens تنتهي بعد 30 يوماً
- ✅ Rate limiting (100 req/15min عام، 20 للـ auth)
- ✅ Helmet.js headers
- ✅ CORS محدد بنطاقات معيّنة
- ✅ المريض لا يستطيع رؤية أو تعديل بيانات مريض آخر
- ✅ الطبيب لا يستطيع تعديل بيانات أي مريض

## 🔜 للإنتاج الحقيقي — أضف لاحقاً
- [ ] HTTPS (SSL certificate)
- [ ] Refresh tokens
- [ ] Email verification للمريض الجديد
- [ ] تشفير الصور الطبية قبل تخزينها
- [ ] نسخ احتياطي تلقائي لقاعدة البيانات
- [ ] Audit log (من عدّل ماذا ومتى)

---

## 📞 API Integration مع الواجهة الأمامية

```javascript
// مثال: تسجيل الدخول من الواجهة
const API = 'http://localhost:3001'; // أو رابط الخادم الإنتاجي

async function login(email, password) {
  const res = await fetch(`${API}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  }
  return data;
}

// مثال: جلب قراءات السكر
async function getVitals() {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API}/api/patient/vitals`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return res.json();
}
```
