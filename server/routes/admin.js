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
