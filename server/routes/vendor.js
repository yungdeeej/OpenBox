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
