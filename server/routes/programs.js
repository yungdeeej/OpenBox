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
