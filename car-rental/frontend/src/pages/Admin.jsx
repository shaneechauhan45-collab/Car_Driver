import { useEffect, useState } from 'react';
import api, { errMsg } from '../api';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [locations, setLocations] = useState([]);
  const [car, setCar] = useState({ brand: '', model: '', price_per_day: '', location_id: '' });
  const [error, setError] = useState('');

  const load = () => {
    api.get('/admin/stats').then((r) => setStats(r.data));
    api.get('/bookings').then((r) => setBookings(r.data));
    api.get('/cars/meta/locations').then((r) => setLocations(r.data));
  };
  useEffect(load, []);
  const run = async (fn) => { setError(''); try { await fn(); load(); } catch (e) { setError(errMsg(e)); } };

  const addCar = (e) => { e.preventDefault(); run(() => api.post('/cars', car)); };
  const addMaintenance = () => {
    const car_id = prompt('Car ID'); const description = prompt('What work is being done?');
    const start_date = prompt('Start date (YYYY-MM-DD)'); const end_date = prompt('End date (YYYY-MM-DD)');
    if (car_id && description && start_date && end_date)
      run(() => api.post('/admin/maintenance', { car_id, description, start_date, end_date }));
  };

  return (
    <>
      <h2>Dashboard</h2>
      {error && <p className="error">{error}</p>}
      {stats && (
        <div className="grid">
          <div className="card">Revenue<h3>₹{stats.revenue}</h3></div>
          <div className="card">Active bookings<h3>{stats.active_bookings}</h3></div>
          <div className="card">Cars<h3>{stats.cars}</h3></div>
          <div className="card">Customers<h3>{stats.customers}</h3></div>
        </div>
      )}
      <h3>Add a car</h3>
      <form className="row" onSubmit={addCar}>
        <label>Brand<input value={car.brand} onChange={(e) => setCar({ ...car, brand: e.target.value })} required /></label>
        <label>Model<input value={car.model} onChange={(e) => setCar({ ...car, model: e.target.value })} required /></label>
        <label>Price per day<input type="number" value={car.price_per_day} onChange={(e) => setCar({ ...car, price_per_day: e.target.value })} required /></label>
        <label>City
          <select value={car.location_id} onChange={(e) => setCar({ ...car, location_id: e.target.value })} required>
            <option value="">Choose</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.city}</option>)}
          </select>
        </label>
        <button className="btn">Add car</button>
        <button type="button" className="btn ghost" onClick={addMaintenance}>Schedule maintenance</button>
      </form>
      <h3>All bookings</h3>
      <table>
        <thead><tr><th>Customer</th><th>Car</th><th>Dates</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>{b.customer}</td><td>{b.brand} {b.model}</td><td>{b.start_date} to {b.end_date}</td><td>{b.status}</td>
              <td>{b.status === 'confirmed' && <button className="btn ghost" onClick={() => run(() => api.patch(`/bookings/${b.id}/complete`))}>Mark returned</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
