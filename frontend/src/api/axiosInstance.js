//frontend/src/api/axiosInstance.js

import axios from 'axios';

const getStoredToken = () => {
  try {
    const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    return authStorage?.state?.token || authStorage?.token || null;
  } catch {
    return null;
  }
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://motogearspitstop-com.onrender.com/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }

  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    const requestUrl = err.config?.url || '';
    const isAuthRequest =
      requestUrl.includes('/auth/login') ||
      requestUrl.includes('/auth/register') ||
      requestUrl.includes('/auth/me');

    const isCheckoutRequest =
      requestUrl.includes('/payment/') ||
      (requestUrl.includes('/orders') && String(err.config?.method || '').toLowerCase() === 'post');

    if (err.response?.status === 401 && !isAuthRequest && !isCheckoutRequest) {
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
