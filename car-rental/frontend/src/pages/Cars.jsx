import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errMsg } from '../api';

export default function Cars() {
  const [params, setParams] = useSearchParams(); // dates live in the URL so they carry to the next page
  const [form, setForm] = useState(Object.fromEntries(params));
  const [cars, setCars] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState('');
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  useEffect(() => { api.get('/cars/meta/locations').then((r) => setLocations(r.data)); }, []);
  useEffect(() => {
    api.get('/cars', { params: Object.fromEntries(params) })
      .then((r) => setCars(r.data)).catch((e) => setError(errMsg(e)));
  }, [params]);

  const search = (e) => {
    e.preventDefault();
    setParams(Object.fromEntries(Object.entries(form).filter(([, v]) => v)));
  };
  const carry = new URLSearchParams({ start: params.get('start') || '', end: params.get('end') || '' }).toString();

  return (
    <>
      <form className="row" onSubmit={search}>
        <label>Pick-up city
          <select value={form.location_id || ''} onChange={set('location_id')}>
            <option value="">Any city</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.city}</option>)}
          </select>
        </label>
        <label>From<input type="date" value={form.start || ''} onChange={set('start')} /></label>
        <label>To<input type="date" value={form.end || ''} onChange={set('end')} /></label>
        <label>Max price per day<input type="number" value={form.max_price || ''} onChange={set('max_price')} /></label>
        <button className="btn">Search</button>
      </form>
      {error && <p className="error">{error}</p>}
      {!cars.length && <p>No cars match. Try different dates or a higher price limit.</p>}
      <div className="grid">
        {cars.map((c) => (
          <div className="card" key={c.id}>
            <h3>{c.brand} {c.model}</h3>
            <p>{c.city}</p>
            <p><strong>₹{c.price_per_day}</strong> per day</p>
            <Link className="btn" to={`/cars/${c.id}?${carry}`}>View and book</Link>
          </div>
        ))}
      </div>
    </>
  );
}
