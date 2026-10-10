const router = require('express').Router();
const pool = require('../db');
const { auth } = require('../middleware/auth');

router.get('/car/:id', async (req, res) => {
  const [rows] = await pool.query(
    `SELECT r.rating, r.comment, r.created_at, u.name FROM reviews r
     JOIN users u ON u.id=r.user_id WHERE r.car_id=? ORDER BY r.created_at DESC`, [req.params.id]);
  res.json(rows);
});

router.post('/', auth, async (req, res) => {
  const { car_id, rating, comment } = req.body;
  const [[ok]] = await pool.query(
    `SELECT id FROM bookings WHERE user_id=? AND car_id=? AND status IN ('confirmed','completed')
     AND end_date<=CURDATE() LIMIT 1`, [req.user.id, car_id]);
  if (!ok) return res.status(403).json({ error: 'You can review a car after your trip ends' });
  await pool.query(
    `INSERT INTO reviews (user_id,car_id,rating,comment) VALUES (?,?,?,?)
     ON DUPLICATE KEY UPDATE rating=VALUES(rating), comment=VALUES(comment)`,
    [req.user.id, car_id, rating, comment]);
  res.status(201).json({ ok: true });
});
module.exports = router;
