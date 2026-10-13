import axios from 'axios';

// In development or when reverse-proxied, use relative '/api'
// In GitHub Pages or standalone mode, fallback to VITE_API_URL or relative
const baseURL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('library_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
