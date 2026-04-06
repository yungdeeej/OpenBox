# MCG Free Laptop Claim System — Full Build Spec
> Claude Code Project Brief · Replit + PostgreSQL + Node.js/Express + React

---

## Project Overview

A multi-surface web application that manages the end-to-end lifecycle of MCG Career College's free laptop benefit program. Enrolled students receive a tokenized claim link, select a laptop from an OpenBox-managed catalog, and submit a request. Finance reviews and approves or denies based on external funding verification. Approved orders route to OpenBox for fulfillment and shipping.

**Three surfaces:**
1. **Student Claim Portal** — public, token-gated
2. **Finance Admin Dashboard** — internal, approve/deny workflow
3. **OpenBox Vendor Portal** — catalog management + order fulfillment

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Express.js |
| Database | PostgreSQL (Replit DB or Neon) |
| ORM | `pg` (raw SQL, no ORM) |
| Frontend | React 18 + Tailwind CSS |
| Auth | JWT (jsonwebtoken) + bcrypt |
| Email | Resend API |
| File Uploads | Cloudinary (laptop images) |
| Env Management | dotenv |
| Dev Server | Vite (frontend) |
| Hosting | Replit (backend + DB) |

---

## Environment Variables

Create a `.env` file at the root with the following:

```
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret_here
RESEND_API_KEY=re_...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
FINANCE_EMAIL=finance@mcgcc.ca
OPENBOX_EMAIL=orders@openbox.ca
FROM_EMAIL=noreply@mcgcc.ca
BASE_URL=https://your-replit-url.repl.co
```

---

## Folder Structure

```
mcg-laptop-claim/
├── server/
│   ├── index.js                  # Express entry point
│   ├── db.js                     # PostgreSQL connection pool
│   ├── middleware/
│   │   ├── auth.js               # JWT verification middleware
│   │   └── requireRole.js        # Role-based access control
│   ├── routes/
│   │   ├── tokens.js             # Token generation + validation
│   │   ├── claims.js             # Student claim submission
│   │   ├── admin.js              # Finance admin actions
│   │   ├── vendor.js             # OpenBox vendor actions
│   │   ├── laptops.js            # Laptop catalog CRUD
│   │   └── auth.js               # Login/logout
│   ├── services/
│   │   ├── email.js              # All email sending via Resend
│   │   └── cloudinary.js         # Image upload helper
│   └── scripts/
│       └── seed.js               # Seed institutions, programs, admin user
├── client/
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx               # Router
│       ├── pages/
│       │   ├── ClaimPortal.jsx   # Student-facing claim form
│       │   ├── ClaimStatus.jsx   # Student status check page
│       │   ├── AdminLogin.jsx    # Shared login for finance + vendor
│       │   ├── FinanceDashboard.jsx
│       │   ├── ClaimDetail.jsx   # Finance review view
│       │   └── VendorDashboard.jsx
│       ├── components/
│       │   ├── LaptopCard.jsx
│       │   ├── StatusBadge.jsx
│       │   ├── ClaimTable.jsx
│       │   └── ShippingForm.jsx
│       └── lib/
│           └── api.js            # Fetch wrapper
├── .env
├── package.json
└── README.md
```

---

## Task 1 — Project Initialization

### 1.1 Initialize the project

```bash
mkdir mcg-laptop-claim && cd mcg-laptop-claim
npm init -y
npm install express pg bcryptjs jsonwebtoken dotenv resend cloudinary multer cors uuid
npm install -D vite @vitejs/plugin-react react react-dom react-router-dom tailwindcss autoprefixer postcss
```

### 1.2 Create `server/index.js`

```javascript
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tokens', require('./routes/tokens'));
app.use('/api/claims', require('./routes/claims'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/vendor', require('./routes/vendor'));
app.use('/api/laptops', require('./routes/laptops'));

// Serve React in production
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

### 1.3 Create `server/db.js`

```javascript
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
module.exports = pool;
```

---

## Task 2 — Database Schema

Run this SQL in order to set up all tables. Execute via `psql` or Replit's DB shell.

### 2.1 Full Schema

```sql
-- Institutions
CREATE TABLE institutions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Programs
CREATE TABLE programs (
  id SERIAL PRIMARY KEY,
  institution_id INTEGER REFERENCES institutions(id),
  name VARCHAR(255) NOT NULL,
  active BOOLEAN DEFAULT true
);

-- Laptop Catalog (managed by OpenBox)
CREATE TABLE laptops (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100),
  model VARCHAR(100),
  specs TEXT,
  price_cad NUMERIC(8,2) NOT NULL,
  image_url TEXT,
  stock_available INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_by INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claim Tokens (one per enrolled student)
CREATE TABLE claim_tokens (
  id SERIAL PRIMARY KEY,
  token_uuid UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  student_email VARCHAR(255) NOT NULL,
  institution_id INTEGER REFERENCES institutions(id),
  used BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Claims
CREATE TABLE claims (
  id SERIAL PRIMARY KEY,
  token_id INTEGER REFERENCES claim_tokens(id),
  student_name VARCHAR(255) NOT NULL,
  student_email VARCHAR(255) NOT NULL,
  student_phone VARCHAR(50),
  student_id_number VARCHAR(100),
  institution_id INTEGER REFERENCES institutions(id),
  program_id INTEGER REFERENCES programs(id),
  laptop_id INTEGER REFERENCES laptops(id),
  status VARCHAR(50) DEFAULT 'pending_review'
    CHECK (status IN ('pending_review','approved','denied','awaiting_shipping','shipped','delivered')),
  finance_notes TEXT,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMPTZ,
  shipping_name VARCHAR(255),
  shipping_address_line1 VARCHAR(255),
  shipping_address_line2 VARCHAR(255),
  shipping_city VARCHAR(100),
  shipping_province VARCHAR(50),
  shipping_postal_code VARCHAR(20),
  shipping_phone VARCHAR(50),
  tracking_number VARCHAR(255),
  carrier VARCHAR(100),
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users (Finance + OpenBox + Super Admin)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin','finance','vendor')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log
CREATE TABLE audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.2 Seed Data (`server/scripts/seed.js`)

```javascript
require('dotenv').config();
const pool = require('../db');
const bcrypt = require('bcryptjs');

async function seed() {
  // Institution
  await pool.query(`
    INSERT INTO institutions (name, slug) VALUES ('MCG Career College', 'mcg')
    ON CONFLICT (slug) DO NOTHING
  `);

  const { rows: [inst] } = await pool.query(`SELECT id FROM institutions WHERE slug = 'mcg'`);

  // Programs
  const programs = [
    'Medical Office Assistant & Unit Clerk',
    'Global Operations and Supply Chain',
    'Architectural Technology',
    'Basic Massage Therapy',
    'Advanced Massage Therapy',
    'Diagnostic Medical Sonography'
  ];
  for (const name of programs) {
    await pool.query(
      `INSERT INTO programs (institution_id, name) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [inst.id, name]
    );
  }

  // Admin user
  const hash = await bcrypt.hash('changeme123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('admin@mcgcc.ca', $1, 'MCG Admin', 'admin')
    ON CONFLICT (email) DO NOTHING
  `, [hash]);

  // Finance user
  const fhash = await bcrypt.hash('changeme123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('finance@mcgcc.ca', $1, 'Finance Team', 'finance')
    ON CONFLICT (email) DO NOTHING
  `, [fhash]);

  // OpenBox vendor user
  const vhash = await bcrypt.hash('changeme123', 10);
  await pool.query(`
    INSERT INTO users (email, password_hash, full_name, role)
    VALUES ('vendor@openbox.ca', $1, 'OpenBox Fulfillment', 'vendor')
    ON CONFLICT (email) DO NOTHING
  `, [vhash]);

  console.log('Seed complete');
  process.exit(0);
}

seed().catch(console.error);
```

Run with: `node server/scripts/seed.js`

> **Default passwords are `changeme123` — update immediately after first login.**

---

## Task 3 — Authentication

### 3.1 `server/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 3.2 `server/middleware/requireRole.js`

```javascript
module.exports = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
};
```

### 3.3 `server/routes/auth.js`

```javascript
const router = require('express').Router();
const pool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1 AND active = true`, [email]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.full_name },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
  res.json({ token, role: user.role, name: user.full_name });
});

module.exports = router;
```

---

## Task 4 — Token System

Tokens are generated by admins (manually or via bulk CSV) and emailed to students. Each token is single-use and expires in 30 days.

### 4.1 `server/routes/tokens.js`

```javascript
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendTokenEmail } = require('../services/email');

// POST /api/tokens/generate — Admin generates a token for a student
router.post('/generate', auth, requireRole('admin', 'finance'), async (req, res) => {
  const { student_email, institution_id } = req.body;
  const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
  const { rows } = await pool.query(
    `INSERT INTO claim_tokens (student_email, institution_id, expires_at)
     VALUES ($1, $2, $3) RETURNING *`,
    [student_email, institution_id, expires_at]
  );
  const token = rows[0];
  await sendTokenEmail(student_email, token.token_uuid);
  res.json({ success: true, token: token.token_uuid });
});

// POST /api/tokens/bulk — Bulk generate from array of emails
router.post('/bulk', auth, requireRole('admin'), async (req, res) => {
  const { emails, institution_id } = req.body; // emails: string[]
  const results = [];
  for (const email of emails) {
    const expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { rows } = await pool.query(
      `INSERT INTO claim_tokens (student_email, institution_id, expires_at)
       VALUES ($1, $2, $3) RETURNING token_uuid`,
      [email, institution_id, expires_at]
    );
    await sendTokenEmail(email, rows[0].token_uuid);
    results.push({ email, token: rows[0].token_uuid });
  }
  res.json({ success: true, results });
});

// GET /api/tokens/validate/:uuid — Validate token before rendering form
router.get('/validate/:uuid', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ct.*, i.name as institution_name
     FROM claim_tokens ct
     JOIN institutions i ON i.id = ct.institution_id
     WHERE ct.token_uuid = $1`,
    [req.params.uuid]
  );
  const token = rows[0];
  if (!token) return res.status(404).json({ valid: false, error: 'Token not found' });
  if (token.used) return res.status(400).json({ valid: false, error: 'This link has already been used' });
  if (new Date(token.expires_at) < new Date()) return res.status(400).json({ valid: false, error: 'This link has expired' });
  res.json({
    valid: true,
    student_email: token.student_email,
    institution_id: token.institution_id,
    institution_name: token.institution_name
  });
});

module.exports = router;
```

---

## Task 5 — Laptop Catalog API

### 5.1 `server/routes/laptops.js`

```javascript
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /api/laptops — Public: active laptops for student claim form
router.get('/', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM laptops WHERE active = true AND stock_available > 0 ORDER BY price_cad ASC`
  );
  res.json(rows);
});

// POST /api/laptops — Vendor: add laptop
router.post('/', auth, requireRole('vendor', 'admin'), async (req, res) => {
  const { name, brand, model, specs, price_cad, image_url, stock_available } = req.body;
  if (parseFloat(price_cad) > 500) return res.status(400).json({ error: 'Price exceeds $500 cap' });
  const { rows } = await pool.query(
    `INSERT INTO laptops (name, brand, model, specs, price_cad, image_url, stock_available, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [name, brand, model, specs, price_cad, image_url, stock_available, req.user.id]
  );
  res.json(rows[0]);
});

// PUT /api/laptops/:id — Vendor: update laptop
router.put('/:id', auth, requireRole('vendor', 'admin'), async (req, res) => {
  const { name, brand, model, specs, price_cad, image_url, stock_available, active } = req.body;
  if (price_cad && parseFloat(price_cad) > 500) return res.status(400).json({ error: 'Price exceeds $500 cap' });
  const { rows } = await pool.query(
    `UPDATE laptops SET name=$1, brand=$2, model=$3, specs=$4, price_cad=$5,
     image_url=$6, stock_available=$7, active=$8, updated_at=NOW()
     WHERE id=$9 RETURNING *`,
    [name, brand, model, specs, price_cad, image_url, stock_available, active, req.params.id]
  );
  res.json(rows[0]);
});

// DELETE /api/laptops/:id — Soft delete
router.delete('/:id', auth, requireRole('vendor', 'admin'), async (req, res) => {
  await pool.query(`UPDATE laptops SET active = false WHERE id = $1`, [req.params.id]);
  res.json({ success: true });
});

module.exports = router;
```

---

## Task 6 — Student Claim Submission

### 6.1 `server/routes/claims.js`

```javascript
const router = require('express').Router();
const pool = require('../db');
const { sendClaimConfirmationToStudent, sendClaimNotificationToFinance } = require('../services/email');

// POST /api/claims — Student submits a claim
router.post('/', async (req, res) => {
  const {
    token_uuid, student_name, student_email, student_phone,
    student_id_number, program_id, laptop_id
  } = req.body;

  // Validate token
  const tokenResult = await pool.query(
    `SELECT * FROM claim_tokens WHERE token_uuid = $1`, [token_uuid]
  );
  const token = tokenResult.rows[0];
  if (!token || token.used || new Date(token.expires_at) < new Date()) {
    return res.status(400).json({ error: 'Invalid or expired token' });
  }

  // Validate laptop exists, is active, in stock, price <= 500
  const laptopResult = await pool.query(
    `SELECT * FROM laptops WHERE id = $1 AND active = true AND stock_available > 0`, [laptop_id]
  );
  const laptop = laptopResult.rows[0];
  if (!laptop) return res.status(400).json({ error: 'Selected laptop is unavailable' });
  if (parseFloat(laptop.price_cad) > 500) return res.status(400).json({ error: 'Laptop exceeds $500 cap' });

  // Create claim
  const { rows } = await pool.query(
    `INSERT INTO claims
     (token_id, student_name, student_email, student_phone, student_id_number,
      institution_id, program_id, laptop_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [token.id, student_name, student_email, student_phone, student_id_number,
     token.institution_id, program_id, laptop_id]
  );
  const claim = rows[0];

  // Mark token as used
  await pool.query(`UPDATE claim_tokens SET used = true WHERE id = $1`, [token.id]);

  // Send emails
  await sendClaimConfirmationToStudent(student_email, student_name, claim.id, laptop);
  await sendClaimNotificationToFinance(claim, laptop);

  res.json({ success: true, claim_id: claim.id });
});

// GET /api/claims/status/:token_uuid — Student checks their claim status
router.get('/status/:token_uuid', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.id, c.status, c.tracking_number, c.carrier, c.shipped_at,
            l.name as laptop_name, l.price_cad,
            p.name as program_name, i.name as institution_name
     FROM claims c
     JOIN claim_tokens ct ON ct.id = c.token_id
     JOIN laptops l ON l.id = c.laptop_id
     JOIN programs p ON p.id = c.program_id
     JOIN institutions i ON i.id = c.institution_id
     WHERE ct.token_uuid = $1`,
    [req.params.token_uuid]
  );
  if (!rows[0]) return res.status(404).json({ error: 'No claim found' });
  res.json(rows[0]);
});

module.exports = router;
```

---

## Task 7 — Finance Admin API

### 7.1 `server/routes/admin.js`

```javascript
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendApprovalEmail, sendDenialEmail } = require('../services/email');

// GET /api/admin/claims — List all claims with filters
router.get('/claims', auth, requireRole('admin','finance'), async (req, res) => {
  const { status, institution_id } = req.query;
  let query = `
    SELECT c.*, l.name as laptop_name, l.price_cad, l.image_url,
           p.name as program_name, i.name as institution_name
    FROM claims c
    JOIN laptops l ON l.id = c.laptop_id
    JOIN programs p ON p.id = c.program_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE 1=1
  `;
  const params = [];
  if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
  if (institution_id) { params.push(institution_id); query += ` AND c.institution_id = $${params.length}`; }
  query += ` ORDER BY c.created_at DESC`;
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// GET /api/admin/claims/:id — Single claim detail
router.get('/claims/:id', auth, requireRole('admin','finance'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT c.*, l.name as laptop_name, l.brand, l.model, l.specs, l.price_cad, l.image_url,
            p.name as program_name, i.name as institution_name
     FROM claims c
     JOIN laptops l ON l.id = c.laptop_id
     JOIN programs p ON p.id = c.program_id
     JOIN institutions i ON i.id = c.institution_id
     WHERE c.id = $1`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Claim not found' });
  res.json(rows[0]);
});

// POST /api/admin/claims/:id/approve
router.post('/claims/:id/approve', auth, requireRole('admin','finance'), async (req, res) => {
  const { notes } = req.body;
  const { rows } = await pool.query(
    `UPDATE claims SET status='approved', finance_notes=$1, reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW()
     WHERE id=$3 AND status='pending_review' RETURNING *`,
    [notes, req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Claim not found or already reviewed' });
  const claim = rows[0];

  // Get laptop details for email
  const { rows: laptopRows } = await pool.query(`SELECT * FROM laptops WHERE id = $1`, [claim.laptop_id]);

  await sendApprovalEmail(claim, laptopRows[0]);

  // Audit log
  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1,'approve','claim',$2,$3)`,
    [req.user.id, claim.id, JSON.stringify({ notes })]
  );

  res.json({ success: true, claim });
});

// POST /api/admin/claims/:id/deny
router.post('/claims/:id/deny', auth, requireRole('admin','finance'), async (req, res) => {
  const { notes } = req.body;
  if (!notes) return res.status(400).json({ error: 'Denial reason is required' });
  const { rows } = await pool.query(
    `UPDATE claims SET status='denied', finance_notes=$1, reviewed_by=$2, reviewed_at=NOW(), updated_at=NOW()
     WHERE id=$3 AND status='pending_review' RETURNING *`,
    [notes, req.user.id, req.params.id]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Claim not found or already reviewed' });

  await sendDenialEmail(rows[0], notes);

  await pool.query(
    `INSERT INTO audit_log (user_id, action, entity_type, entity_id, metadata)
     VALUES ($1,'deny','claim',$2,$3)`,
    [req.user.id, rows[0].id, JSON.stringify({ notes })]
  );

  res.json({ success: true });
});

// GET /api/admin/stats — Dashboard summary
router.get('/stats', auth, requireRole('admin','finance'), async (req, res) => {
  const { rows } = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status = 'pending_review') as pending,
      COUNT(*) FILTER (WHERE status = 'approved') as approved,
      COUNT(*) FILTER (WHERE status = 'denied') as denied,
      COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
      COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
      SUM(l.price_cad) FILTER (WHERE c.status IN ('approved','awaiting_shipping','shipped','delivered')) as total_committed
    FROM claims c
    JOIN laptops l ON l.id = c.laptop_id
  `);
  res.json(rows[0]);
});

module.exports = router;
```

---

## Task 8 — OpenBox Vendor API

### 8.1 `server/routes/vendor.js`

```javascript
const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendShippingFormEmail, sendTrackingEmail } = require('../services/email');

// GET /api/vendor/orders — All approved orders assigned to OpenBox
router.get('/orders', auth, requireRole('vendor','admin'), async (req, res) => {
  const { status } = req.query;
  let query = `
    SELECT c.*, l.name as laptop_name, l.brand, l.model, l.specs, l.price_cad,
           p.name as program_name, i.name as institution_name
    FROM claims c
    JOIN laptops l ON l.id = c.laptop_id
    JOIN programs p ON p.id = c.program_id
    JOIN institutions i ON i.id = c.institution_id
    WHERE c.status IN ('approved','awaiting_shipping','shipped','delivered')
  `;
  const params = [];
  if (status) { params.push(status); query += ` AND c.status = $${params.length}`; }
  query += ` ORDER BY c.reviewed_at ASC`;
  const { rows } = await pool.query(query, params);
  res.json(rows);
});

// POST /api/vendor/orders/:id/send-shipping-form — Trigger shipping address email to student
router.post('/orders/:id/send-shipping-form', auth, requireRole('vendor','admin'), async (req, res) => {
  const { rows } = await pool.query(
    `UPDATE claims SET status='awaiting_shipping', updated_at=NOW() WHERE id=$1 AND status='approved' RETURNING *`,
    [req.params.id]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Order not in approved state' });
  await sendShippingFormEmail(rows[0]);
  res.json({ success: true });
});

// POST /api/vendor/orders/:id/ship — Mark as shipped with tracking number
router.post('/orders/:id/ship', auth, requireRole('vendor','admin'), async (req, res) => {
  const { tracking_number, carrier } = req.body;
  if (!tracking_number || !carrier) return res.status(400).json({ error: 'Tracking number and carrier required' });
  const { rows } = await pool.query(
    `UPDATE claims SET status='shipped', tracking_number=$1, carrier=$2, shipped_at=NOW(), updated_at=NOW()
     WHERE id=$3 AND status IN ('awaiting_shipping','approved') RETURNING *`,
    [tracking_number, carrier, req.params.id]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Order not found' });
  await sendTrackingEmail(rows[0]);
  res.json({ success: true });
});

// POST /api/vendor/orders/:id/deliver — Mark as delivered
router.post('/orders/:id/deliver', auth, requireRole('vendor','admin'), async (req, res) => {
  await pool.query(
    `UPDATE claims SET status='delivered', delivered_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [req.params.id]
  );

  // Decrement stock
  const { rows: [claim] } = await pool.query(`SELECT laptop_id FROM claims WHERE id = $1`, [req.params.id]);
  await pool.query(`UPDATE laptops SET stock_available = stock_available - 1 WHERE id = $1 AND stock_available > 0`, [claim.laptop_id]);

  res.json({ success: true });
});

module.exports = router;
```

---

## Task 9 — Shipping Address Submission (Student)

Students receive a link to submit their shipping address. This route is public and validated by claim ID + token UUID.

### 9.1 Add to `server/routes/claims.js`

```javascript
// POST /api/claims/:id/shipping — Student submits shipping address
router.post('/:id/shipping', async (req, res) => {
  const { token_uuid, shipping_name, shipping_address_line1, shipping_address_line2,
          shipping_city, shipping_province, shipping_postal_code, shipping_phone } = req.body;

  // Verify token matches claim
  const { rows } = await pool.query(
    `SELECT c.* FROM claims c
     JOIN claim_tokens ct ON ct.id = c.token_id
     WHERE c.id = $1 AND ct.token_uuid = $2 AND c.status = 'awaiting_shipping'`,
    [req.params.id, token_uuid]
  );
  if (!rows[0]) return res.status(400).json({ error: 'Invalid request or shipping already submitted' });

  await pool.query(
    `UPDATE claims SET
     shipping_name=$1, shipping_address_line1=$2, shipping_address_line2=$3,
     shipping_city=$4, shipping_province=$5, shipping_postal_code=$6, shipping_phone=$7,
     updated_at=NOW()
     WHERE id=$8`,
    [shipping_name, shipping_address_line1, shipping_address_line2,
     shipping_city, shipping_province, shipping_postal_code, shipping_phone, req.params.id]
  );

  res.json({ success: true });
});
```

---

## Task 10 — Email Service

### 10.1 `server/services/email.js`

```javascript
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);
const BASE_URL = process.env.BASE_URL;
const FROM = process.env.FROM_EMAIL;

// 1. Token delivery to student
async function sendTokenEmail(student_email, token_uuid) {
  const claimUrl = `${BASE_URL}/claim?token=${token_uuid}`;
  await resend.emails.send({
    from: FROM,
    to: student_email,
    subject: 'Your free laptop claim link — MCG Career College',
    html: `
      <p>Hi there,</p>
      <p>Congratulations on your enrollment at MCG Career College! As part of your program, you are eligible to claim a <strong>free laptop (up to $500 value)</strong>.</p>
      <p><a href="${claimUrl}" style="background:#1A1A1A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Claim Your Laptop →</a></p>
      <p>This link is unique to you and expires in <strong>30 days</strong>. Do not share it.</p>
      <p>Questions? Contact <a href="mailto:admissions@mcgcc.ca">admissions@mcgcc.ca</a></p>
      <p>— MCG Career College</p>
    `
  });
}

// 2. Confirmation to student after submission
async function sendClaimConfirmationToStudent(student_email, student_name, claim_id, laptop) {
  const statusUrl = `${BASE_URL}/status?claim=${claim_id}`;
  await resend.emails.send({
    from: FROM,
    to: student_email,
    subject: 'Your laptop claim has been received',
    html: `
      <p>Hi ${student_name},</p>
      <p>We received your laptop claim request for the <strong>${laptop.name}</strong> ($${laptop.price_cad}).</p>
      <p>Our finance team will verify your funding status and respond within <strong>2–3 business days</strong>.</p>
      <p><a href="${statusUrl}">Check your claim status →</a></p>
      <p>— MCG Career College</p>
    `
  });
}

// 3. Notification to finance team
async function sendClaimNotificationToFinance(claim, laptop) {
  const reviewUrl = `${BASE_URL}/admin/claims/${claim.id}`;
  await resend.emails.send({
    from: FROM,
    to: process.env.FINANCE_EMAIL,
    subject: `New laptop claim — ${claim.student_name}`,
    html: `
      <p>A new laptop claim has been submitted and requires review.</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <tr><td style="padding:6px 0;color:#666;">Student</td><td><strong>${claim.student_name}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Email</td><td>${claim.student_email}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student ID</td><td>${claim.student_id_number || 'N/A'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Laptop</td><td>${laptop.name} — $${laptop.price_cad}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Submitted</td><td>${new Date().toLocaleString('en-CA')}</td></tr>
      </table>
      <p><a href="${reviewUrl}" style="background:#1A1A1A;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin-top:12px;">Review Claim →</a></p>
    `
  });
}

// 4. Approval email to student + OpenBox notification
async function sendApprovalEmail(claim, laptop) {
  // Student email
  await resend.emails.send({
    from: FROM,
    to: claim.student_email,
    subject: 'Your laptop claim is approved! 🎉',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Great news — your laptop claim has been <strong>approved</strong>!</p>
      <p>You selected: <strong>${laptop.name}</strong></p>
      <p>OpenBox will reach out shortly with a form to collect your shipping details. Watch for an email from them.</p>
      <p>— MCG Career College</p>
    `
  });

  // OpenBox notification
  await resend.emails.send({
    from: FROM,
    to: process.env.OPENBOX_EMAIL,
    subject: `New approved laptop order — Claim #${claim.id}`,
    html: `
      <p>A laptop claim has been approved. Please process this order.</p>
      <table style="border-collapse:collapse;width:100%;max-width:480px;">
        <tr><td style="padding:6px 0;color:#666;">Claim ID</td><td><strong>#${claim.id}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student Name</td><td>${claim.student_name}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student Email</td><td>${claim.student_email}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Student Phone</td><td>${claim.student_phone || 'N/A'}</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Laptop</td><td>${laptop.name} (${laptop.brand} ${laptop.model})</td></tr>
        <tr><td style="padding:6px 0;color:#666;">Specs</td><td>${laptop.specs || 'N/A'}</td></tr>
      </table>
      <p>Log into the vendor portal to send the student a shipping details form and update fulfillment status.</p>
      <p><a href="${process.env.BASE_URL}/vendor">Open Vendor Portal →</a></p>
    `
  });
}

// 5. Denial email to student
async function sendDenialEmail(claim, reason) {
  await resend.emails.send({
    from: FROM,
    to: claim.student_email,
    subject: 'Update on your laptop claim',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Unfortunately, your laptop claim could not be approved at this time.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>If you believe this is an error or have questions, please contact your admissions advisor or email <a href="mailto:admissions@mcgcc.ca">admissions@mcgcc.ca</a>.</p>
      <p>— MCG Career College</p>
    `
  });
}

// 6. Shipping form link to student (from vendor)
async function sendShippingFormEmail(claim) {
  const shippingUrl = `${process.env.BASE_URL}/shipping?claim=${claim.id}&token=${claim.token_uuid}`;
  await resend.emails.send({
    from: process.env.FROM_EMAIL,
    to: claim.student_email,
    subject: 'Action required — submit your shipping address',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Your laptop is ready to ship! Please provide your shipping address using the link below.</p>
      <p><a href="${shippingUrl}" style="background:#1A1A1A;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">Submit Shipping Address →</a></p>
      <p>Please complete this within <strong>5 business days</strong> to avoid delays.</p>
      <p>— OpenBox / MCG Career College</p>
    `
  });
}

// 7. Tracking number to student
async function sendTrackingEmail(claim) {
  await resend.emails.send({
    from: FROM,
    to: claim.student_email,
    subject: 'Your laptop is on its way!',
    html: `
      <p>Hi ${claim.student_name},</p>
      <p>Your laptop has been shipped!</p>
      <p><strong>Carrier:</strong> ${claim.carrier}<br/>
         <strong>Tracking #:</strong> ${claim.tracking_number}</p>
      <p>You can track your shipment on the carrier's website using the tracking number above.</p>
      <p>— MCG Career College</p>
    `
  });
}

module.exports = {
  sendTokenEmail,
  sendClaimConfirmationToStudent,
  sendClaimNotificationToFinance,
  sendApprovalEmail,
  sendDenialEmail,
  sendShippingFormEmail,
  sendTrackingEmail
};
```

---

## Task 11 — Frontend: React Router Setup

### 11.1 `client/src/App.jsx`

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ClaimPortal from './pages/ClaimPortal';
import ClaimStatus from './pages/ClaimStatus';
import ShippingForm from './pages/ShippingForm';
import AdminLogin from './pages/AdminLogin';
import FinanceDashboard from './pages/FinanceDashboard';
import ClaimDetail from './pages/ClaimDetail';
import VendorDashboard from './pages/VendorDashboard';

function PrivateRoute({ children, role }) {
  const token = localStorage.getItem('jwt');
  const userRole = localStorage.getItem('role');
  if (!token) return <Navigate to="/login" />;
  if (role && userRole !== role && userRole !== 'admin') return <Navigate to="/login" />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Student surfaces */}
        <Route path="/claim" element={<ClaimPortal />} />
        <Route path="/status" element={<ClaimStatus />} />
        <Route path="/shipping" element={<ShippingForm />} />

        {/* Internal */}
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/admin" element={<PrivateRoute role="finance"><FinanceDashboard /></PrivateRoute>} />
        <Route path="/admin/claims/:id" element={<PrivateRoute role="finance"><ClaimDetail /></PrivateRoute>} />
        <Route path="/vendor" element={<PrivateRoute role="vendor"><VendorDashboard /></PrivateRoute>} />

        <Route path="*" element={<Navigate to="/claim" />} />
      </Routes>
    </BrowserRouter>
  );
}
```

---

## Task 12 — Frontend Pages

### 12.1 Student Claim Portal (`client/src/pages/ClaimPortal.jsx`)

Build this page with the following sections in order:
- On mount: read `?token=` from URL, call `GET /api/tokens/validate/:uuid`
  - If invalid/expired: show error state with message
  - If valid: render form with pre-filled email (locked)
- **Step 1** — Enrollment Info
  - College: locked to "MCG Career College" (from token)
  - Program of Study: dropdown populated from `GET /api/programs?institution_id=X`
  - Student ID: text input
- **Step 2** — Personal Details
  - First Name, Last Name, Email (pre-filled, readonly), Phone
- **Step 3** — Laptop Selection
  - Load from `GET /api/laptops` (active, in stock)
  - Render as selectable card grid (name, specs, price, image)
  - Max price cap visible: "All options covered up to $500"
- **Eligibility Checkbox** — gates submit button
- **Submit** calls `POST /api/claims` with all fields + token UUID
- **Success State** — show 4-step timeline (Received → Finance Review → Approved → Delivered)

### 12.2 Finance Dashboard (`client/src/pages/FinanceDashboard.jsx`)

- Top stat bar: pending / approved / denied / shipped counts + total $ committed
- Tab filters: All / Pending / Approved / Denied / Shipped
- Claims table columns: Student Name, Program, College, Laptop, Price, Submitted Date, Status badge
- Click row → go to `/admin/claims/:id`
- "Generate Token" button → modal with email input → calls `POST /api/tokens/generate`

### 12.3 Claim Detail (`client/src/pages/ClaimDetail.jsx`)

- Full student info panel
- Laptop selected (name, specs, price, image)
- Status badge + timeline
- Finance notes text area
- **Approve** button → `POST /api/admin/claims/:id/approve` (with optional note)
- **Deny** button → `POST /api/admin/claims/:id/deny` (note required)
- Audit trail at bottom (who reviewed, when)

### 12.4 Vendor Dashboard (`client/src/pages/VendorDashboard.jsx`)

- Tab filters: Approved / Awaiting Shipping / Shipped / Delivered
- Order cards: student name, laptop, college, date approved
- Per-order actions:
  - **Send Shipping Form** → `POST /api/vendor/orders/:id/send-shipping-form`
  - **Mark Shipped** → modal with tracking number + carrier → `POST /api/vendor/orders/:id/ship`
  - **Mark Delivered** → `POST /api/vendor/orders/:id/deliver`
- Laptop Catalog section:
  - List all laptops (active + inactive)
  - Add Laptop form: name, brand, model, specs, price (max $500 enforced), stock, image upload
  - Edit / toggle active per laptop

### 12.5 Student Status Page (`client/src/pages/ClaimStatus.jsx`)

- Read `?claim=` + `?token=` from URL (or let student input claim ID manually)
- Call `GET /api/claims/status/:token_uuid`
- Display: laptop selected, current status, tracking number (if shipped), program name
- Visual timeline with active step highlighted

### 12.6 Shipping Form (`client/src/pages/ShippingForm.jsx`)

- Read `?claim=` + `?token=` from URL
- Collect: Full Name, Address Line 1, Address Line 2, City, Province (dropdown), Postal Code, Phone
- Submit to `POST /api/claims/:id/shipping`
- Confirm screen after submission

---

## Task 13 — Cloudinary Image Upload (Vendor)

### 13.1 `server/services/cloudinary.js`

```javascript
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const upload = multer({ storage: multer.memoryStorage() });

async function uploadLaptopImage(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'mcg-laptops', transformation: [{ width: 600, height: 400, crop: 'fill' }] },
      (error, result) => error ? reject(error) : resolve(result.secure_url)
    );
    stream.end(file.buffer);
  });
}

module.exports = { upload, uploadLaptopImage };
```

### 13.2 Add image upload route to `server/routes/laptops.js`

```javascript
const { upload, uploadLaptopImage } = require('../services/cloudinary');

// POST /api/laptops/upload-image
router.post('/upload-image', auth, requireRole('vendor','admin'), upload.single('image'), async (req, res) => {
  const url = await uploadLaptopImage(req.file);
  res.json({ url });
});
```

---

## Task 14 — Programs API

### 14.1 Add `server/routes/programs.js`

```javascript
const router = require('express').Router();
const pool = require('../db');

// GET /api/programs?institution_id=1
router.get('/', async (req, res) => {
  const { institution_id } = req.query;
  const { rows } = await pool.query(
    `SELECT * FROM programs WHERE institution_id = $1 AND active = true ORDER BY name ASC`,
    [institution_id]
  );
  res.json(rows);
});

module.exports = router;
```

Add to `server/index.js`: `app.use('/api/programs', require('./routes/programs'));`

---

## Task 15 — Final Validation & Edge Cases

### 15.1 Validations to enforce in API layer

| Rule | Where Enforced |
|---|---|
| Token single-use | `claims.js` — check `used = false` before insert |
| Token expiry | `claims.js` — check `expires_at > NOW()` |
| Laptop price ≤ $500 | `laptops.js` POST/PUT + `claims.js` submission |
| Laptop in stock | `claims.js` — `stock_available > 0` check |
| Denial requires reason | `admin.js` — validate `notes` not empty on deny |
| Shipping locked after shipped | `claims/:id/shipping` — only allows `awaiting_shipping` status |
| Finance review idempotency | `admin.js` — `WHERE status = 'pending_review'` on update |

### 15.2 Admin-only: Token list endpoint

```javascript
// GET /api/tokens — List all tokens with usage status
router.get('/', auth, requireRole('admin'), async (req, res) => {
  const { rows } = await pool.query(
    `SELECT ct.*, i.name as institution_name
     FROM claim_tokens ct
     JOIN institutions i ON i.id = ct.institution_id
     ORDER BY ct.created_at DESC`
  );
  res.json(rows);
});
```

---

## Task 16 — `package.json` Scripts

```json
{
  "scripts": {
    "start": "node server/index.js",
    "dev:server": "nodemon server/index.js",
    "dev:client": "cd client && vite",
    "build": "cd client && vite build",
    "seed": "node server/scripts/seed.js"
  }
}
```

---

## Task 17 — Deployment Checklist (Replit)

- [ ] Set all `.env` values in Replit Secrets
- [ ] Run `npm run seed` to create institutions, programs, and default users
- [ ] Change all default passwords immediately after first login
- [ ] Verify Resend domain is verified (or use `onboarding@resend.dev` for testing)
- [ ] Set `BASE_URL` to your Replit app URL (e.g. `https://mcg-laptop-claim.repl.co`)
- [ ] Run `npm run build` to compile React frontend
- [ ] Test full flow end-to-end:
  1. Generate token via admin → email arrives with link
  2. Student fills form → confirmation email received
  3. Finance sees claim in dashboard → approves → student + OpenBox emailed
  4. Vendor logs in → sends shipping form → student submits address
  5. Vendor marks shipped with tracking → student receives tracking email
  6. Vendor marks delivered → stock decremented

---

## Status Reference

| Status | Meaning |
|---|---|
| `pending_review` | Submitted by student, awaiting finance |
| `approved` | Finance approved, OpenBox notified |
| `denied` | Finance denied, student notified |
| `awaiting_shipping` | OpenBox sent shipping form to student |
| `shipped` | Tracking number entered by OpenBox |
| `delivered` | Laptop confirmed delivered |

---

## Notes for Claude Code

- Build backend first (Tasks 1–10), test all API endpoints with a REST client before building frontend
- Use `console.log` liberally during dev; strip before production
- All monetary values stored as `NUMERIC(8,2)` — never as floats in JS, use `.toFixed(2)` for display
- All dates stored as `TIMESTAMPTZ` — display in `en-CA` locale
- React pages should use `fetch` via a shared `client/src/lib/api.js` wrapper that attaches the JWT from `localStorage` automatically
- Design system: dark on white, Apple-esque, Tailwind utility classes, Inter or system font, rounded-xl cards, black CTA buttons
