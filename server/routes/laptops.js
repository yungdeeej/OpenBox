const router = require('express').Router();
const pool = require('../db');
const auth = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');
const { upload, uploadLaptopImage } = require('../services/cloudinary');

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

// POST /api/laptops/upload-image
router.post('/upload-image', auth, requireRole('vendor','admin'), upload.single('image'), async (req, res) => {
  const url = await uploadLaptopImage(req.file);
  res.json({ url });
});

module.exports = router;
