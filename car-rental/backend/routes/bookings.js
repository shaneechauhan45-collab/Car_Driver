const router = require('express').Router();
const pool = require('../db');
const { auth, admin } = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
  const { car_id, start_date, end_date } = req.body;
  const s = new Date(start_date), e = new Date(end_date);
  if (isNaN(s) || isNaN(e) || e <= s || s < new Date(new Date().toDateString()))
    return res.status(400).json({ error: 'Choose valid future dates' });
  const days = Math.ceil((e - s) / 864e5);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    // Lock the car row so two people can't book the same dates at once.
    const [[car]] = await conn.query("SELECT * FROM cars WHERE id=? AND status='available' FOR UPDATE", [car_id]);
    if (!car) { await conn.rollback(); return res.status(404).json({ error: 'Car not available' }); }
    const [[{ n }]] = await conn.query(
      `SELECT (SELECT COUNT(*) FROM bookings b WHERE b.car_id=? AND
                (b.status='confirmed' OR (b.status='pending' AND b.created_at > NOW() - INTERVAL 15 MINUTE))
                AND b.start_date<? AND b.end_date>?)
            + (SELECT COUNT(*) FROM maintenance m WHERE m.car_id=? AND m.start_date<? AND m.end_date>?) AS n`,
      [car_id, end_date, start_date, car_id, end_date, start_date]);
    if (n) { await conn.rollback(); return res.status(409).json({ error: 'Car is already booked for those dates' }); }
    const total = days * Number(car.price_per_day);
    const [r] = await conn.query(
      'INSERT INTO bookings (user_id,car_id,start_date,end_date,total_price) VALUES (?,?,?,?,?)',
      [req.user.id, car_id, start_date, end_date, total]);
    await conn.commit();
    res.status(201).json({ id: r.insertId, days, total_price: total });
  } catch (err) {
    await conn.rollback(); console.error(err);
    res.status(500).json({ error: 'Booking failed' });
  } finally { conn.release(); }
});

router.get('/mine', auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, c.brand, c.model FROM bookings b JOIN cars c ON c.id=b.car_id
     WHERE b.user_id=? ORDER BY b.created_at DESC`, [req.user.id]);
  res.json(rows);
});

router.get('/', auth, admin, async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT b.*, c.brand, c.model, u.name AS customer FROM bookings b
     JOIN cars c ON c.id=b.car_id JOIN users u ON u.id=b.user_id ORDER BY b.created_at DESC`);
  res.json(rows);
});

router.patch('/:id/cancel', auth, async (req, res) => {
  const [r] = await pool.query(
    `UPDATE bookings SET status='cancelled' WHERE id=? AND status IN ('pending','confirmed')
     AND (user_id=? OR ?)`, [req.params.id, req.user.id, req.user.role === 'admin']);
  if (!r.affectedRows) return res.status(404).json({ error: 'Booking cannot be cancelled' });
  res.json({ ok: true }); // refunds: trigger a Razorpay refund here if the booking was paid
});

router.patch('/:id/complete', auth, admin, async (req, res) => {
  await pool.query("UPDATE bookings SET status='completed' WHERE id=? AND status='confirmed'", [req.params.id]);
  res.json({ ok: true });
});
module.exports = router;
