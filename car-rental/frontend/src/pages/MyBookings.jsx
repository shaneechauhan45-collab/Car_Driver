import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { payForBooking } from '../pay';

export default function MyBookings() {
  const { user } = useAuth();
  const [rows, setRows] = useState([]);
  const [error, setError] = useState('');
  const load = () => api.get('/bookings/mine').then((r) => setRows(r.data));
  useEffect(() => { load(); }, []);

  const act = async (fn) => { setError(''); try { await fn(); await load(); } catch (e) { setError(errMsg(e)); } };
  const review = (b) => {
    const rating = Number(prompt('Rating from 1 to 5'));
    if (!rating) return;
    const comment = prompt('Write a short review') || '';
    act(() => api.post('/reviews', { car_id: b.car_id, rating, comment }));
  };
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <h2>My bookings</h2>
      {error && <p className="error">{error}</p>}
      {!rows.length && <p>You have no bookings yet.</p>}
      <table>
        <thead><tr><th>Car</th><th>Dates</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id}>
              <td>{b.brand} {b.model}</td>
              <td>{b.start_date} to {b.end_date}</td>
              <td>₹{b.total_price}</td>
              <td>{b.status}</td>
              <td>
                {b.status === 'pending' && <button className="btn" onClick={() => act(() => payForBooking(b.id, user))}>Pay now</button>}{' '}
                {['pending', 'confirmed'].includes(b.status) && <button className="btn ghost" onClick={() => act(() => api.patch(`/bookings/${b.id}/cancel`))}>Cancel</button>}
                {['confirmed', 'completed'].includes(b.status) && b.end_date <= today && <button className="btn ghost" onClick={() => review(b)}>Review</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
