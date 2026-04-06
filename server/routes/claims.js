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

module.exports = router;
