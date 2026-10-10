const router = require('express').Router();
const crypto = require('crypto');
const Razorpay = require('razorpay');
const pool = require('../db');
const { auth } = require('../middleware/auth');

const rz = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });

router.post('/create-order', auth, async (req, res) => {
  const [[b]] = await pool.query(
    "SELECT * FROM bookings WHERE id=? AND user_id=? AND status='pending'", [req.body.booking_id, req.user.id]);
  if (!b) return res.status(404).json({ error: 'No pending booking found (it may have expired)' });
  const order = await rz.orders.create({
    amount: Math.round(Number(b.total_price) * 100), currency: 'INR', receipt: `booking_${b.id}` });
  await pool.query('INSERT INTO payments (booking_id,amount,razorpay_order_id) VALUES (?,?,?)',
    [b.id, b.total_price, order.id]);
  res.json({ order, key_id: process.env.RAZORPAY_KEY_ID });
});

router.post('/verify', auth, async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (expected !== razorpay_signature) {
    await pool.query("UPDATE payments SET status='failed' WHERE razorpay_order_id=?", [razorpay_order_id]);
    return res.status(400).json({ error: 'Payment verification failed' });
  }
  const [[p]] = await pool.query('SELECT * FROM payments WHERE razorpay_order_id=?', [razorpay_order_id]);
  if (!p) return res.status(404).json({ error: 'Payment not found' });
  await pool.query("UPDATE payments SET status='paid', razorpay_payment_id=? WHERE id=?", [razorpay_payment_id, p.id]);
  await pool.query("UPDATE bookings SET status='confirmed' WHERE id=?", [p.booking_id]);
  res.json({ ok: true, booking_id: p.booking_id });
});
module.exports = router;
