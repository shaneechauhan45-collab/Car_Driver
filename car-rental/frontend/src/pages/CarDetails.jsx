import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';
import { useAuth } from '../AuthContext';
import { payForBooking } from '../pay';

export default function CarDetails() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const here = useLocation();
  const [car, setCar] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [dates, setDates] = useState({ start: params.get('start') || '', end: params.get('end') || '' });
  const [msg, setMsg] = useState({ text: '', ok: false });

  useEffect(() => {
    api.get(`/cars/${id}`).then((r) => setCar(r.data)).catch((e) => setMsg({ text: errMsg(e) }));
    api.get(`/reviews/car/${id}`).then((r) => setReviews(r.data));
  }, [id]);

  const days = dates.start && dates.end ? Math.ceil((new Date(dates.end) - new Date(dates.start)) / 864e5) : 0;

  const book = async () => {
    if (!user) return nav('/login', { state: { from: here.pathname + here.search } });
    try {
      const { data } = await api.post('/bookings', { car_id: id, start_date: dates.start, end_date: dates.end });
      await payForBooking(data.id, user);
      nav('/my-bookings');
    } catch (e) { setMsg({ text: errMsg(e) }); }
  };

  if (!car) return <p>{msg.text || 'Loading…'}</p>;
  return (
    <div className="card">
      <h2>{car.brand} {car.model}</h2>
      <p>{car.address}, {car.city}</p>
      <p><strong>₹{car.price_per_day}</strong> per day{car.avg_rating && ` · rated ${car.avg_rating}/5`}</p>
      <div className="row">
        <label>From<input type="date" value={dates.start} onChange={(e) => setDates({ ...dates, start: e.target.value })} /></label>
        <label>To<input type="date" value={dates.end} onChange={(e) => setDates({ ...dates, end: e.target.value })} /></label>
        <button className="btn" onClick={book} disabled={days < 1}>
          {days > 0 ? `Pay ₹${days * car.price_per_day} and book` : 'Choose dates to book'}
        </button>
      </div>
      {msg.text && <p className={msg.ok ? 'ok' : 'error'}>{msg.text}</p>}
      <h3>Reviews</h3>
      {!reviews.length && <p>No reviews yet.</p>}
      {reviews.map((r, i) => <p key={i}><strong>{r.name}</strong> {r.rating}/5. {r.comment}</p>)}
    </div>
  );
}
