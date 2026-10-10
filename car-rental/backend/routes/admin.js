const router = require('express').Router();
const pool = require('../db');
const { auth, admin } = require('../middleware/auth');
router.use(auth, admin);

router.get('/stats', async (_req, res) => {
  const [[s]] = await pool.query(
    `SELECT (SELECT COUNT(*) FROM users WHERE role='customer') AS customers,
            (SELECT COUNT(*) FROM cars WHERE status<>'retired') AS cars,
            (SELECT COUNT(*) FROM bookings WHERE status='confirmed') AS active_bookings,
            (SELECT COALESCE(SUM(amount),0) FROM payments WHERE status='paid') AS revenue`);
  const [monthly] = await pool.query(
    `SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, SUM(amount) AS revenue
     FROM payments WHERE status='paid' GROUP BY month ORDER BY month DESC LIMIT 12`);
  res.json({ ...s, monthly });
});

router.get('/maintenance', async (_req, res) => {
  const [rows] = await pool.query(
    'SELECT m.*, c.brand, c.model FROM maintenance m JOIN cars c ON c.id=m.car_id ORDER BY m.start_date DESC');
  res.json(rows);
});

router.post('/maintenance', async (req, res) => {
  const { car_id, description, cost, start_date, end_date } = req.body;
  const [r] = await pool.query(
    'INSERT INTO maintenance (car_id,description,cost,start_date,end_date) VALUES (?,?,?,?,?)',
    [car_id, description, cost || 0, start_date, end_date]);
  res.status(201).json({ id: r.insertId });
});
module.exports = router;
