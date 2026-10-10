const router = require('express').Router();
const pool = require('../db');
const { auth, admin } = require('../middleware/auth');

// A car is blocked by confirmed bookings, and by pending ones younger than 15 minutes.
const BLOCKING = `(b.status='confirmed' OR (b.status='pending' AND b.created_at > NOW() - INTERVAL 15 MINUTE))`;

router.get('/meta/locations', async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM locations ORDER BY city');
  res.json(rows);
});

router.get('/', async (req, res) => {
  const { location_id, max_price, start, end } = req.query;
  let sql = `SELECT c.*, l.city FROM cars c JOIN locations l ON l.id=c.location_id WHERE c.status='available'`;
  const p = [];
  if (location_id) { sql += ' AND c.location_id=?'; p.push(location_id); }
  if (max_price) { sql += ' AND c.price_per_day<=?'; p.push(max_price); }
  if (start && end) {
    sql += ` AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.car_id=c.id AND ${BLOCKING}
             AND b.start_date<? AND b.end_date>?)
             AND NOT EXISTS (SELECT 1 FROM maintenance m WHERE m.car_id=c.id AND m.start_date<? AND m.end_date>?)`;
    p.push(end, start, end, start);
  }
  const [rows] = await pool.query(sql + ' ORDER BY c.price_per_day', p);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const [[car]] = await pool.query(
    `SELECT c.*, l.city, l.address,
       (SELECT ROUND(AVG(rating),1) FROM reviews WHERE car_id=c.id) AS avg_rating
     FROM cars c JOIN locations l ON l.id=c.location_id WHERE c.id=?`, [req.params.id]);
  if (!car) return res.status(404).json({ error: 'Car not found' });
  res.json(car);
});

router.post('/', auth, admin, async (req, res) => {
  const { brand, model, price_per_day, location_id, image_url } = req.body;
  const [r] = await pool.query(
    'INSERT INTO cars (brand,model,price_per_day,location_id,image_url) VALUES (?,?,?,?,?)',
    [brand, model, price_per_day, location_id, image_url || null]);
  res.status(201).json({ id: r.insertId });
});

router.put('/:id', auth, admin, async (req, res) => {
  const { brand, model, price_per_day, status, location_id, image_url } = req.body;
  await pool.query(
    'UPDATE cars SET brand=?,model=?,price_per_day=?,status=?,location_id=?,image_url=? WHERE id=?',
    [brand, model, price_per_day, status, location_id, image_url || null, req.params.id]);
  res.json({ ok: true });
});

router.delete('/:id', auth, admin, async (req, res) => {
  await pool.query("UPDATE cars SET status='retired' WHERE id=?", [req.params.id]); // soft delete keeps booking history
  res.json({ ok: true });
});
module.exports = router;
