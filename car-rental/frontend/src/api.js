import axios from 'axios';
const api = axios.create({ baseURL: '/api' });
// Attach the JWT to every request automatically.
api.interceptors.request.use((cfg) => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});
export const errMsg = (e) => e.response?.data?.error || e.message || 'Something went wrong';
export default api;
