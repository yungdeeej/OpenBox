const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { sendTokenEmail } = require('../services/email');

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
