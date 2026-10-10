import api from './api';

const loadScript = () => new Promise((resolve) => {
  if (window.Razorpay) return resolve(true);
  const s = document.createElement('script');
  s.src = 'https://checkout.razorpay.com/v1/checkout.js';
  s.onload = () => resolve(true); s.onerror = () => resolve(false);
  document.body.appendChild(s);
});

export async function payForBooking(bookingId, user) {
  if (!(await loadScript())) throw new Error('Could not load Razorpay checkout');
  const { data } = await api.post('/payments/create-order', { booking_id: bookingId });
  return new Promise((resolve, reject) => {
    const checkout = new window.Razorpay({
      key: data.key_id, amount: data.order.amount, currency: 'INR', order_id: data.order.id,
      name: 'Car Rental', prefill: { name: user.name, email: user.email },
      handler: async (resp) => { // the server verifies the signature before confirming
        try { await api.post('/payments/verify', resp); resolve(); } catch (e) { reject(e); }
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    });
    checkout.open();
  });
}
