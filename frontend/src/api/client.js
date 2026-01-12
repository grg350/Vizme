import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// Use relative path when served through nginx proxy, otherwise use the API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: API_BASE_URL ? `${API_BASE_URL}/api/v1` : '/api/v1',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor to add auth token
client.interceptors.request.use(
  (config) => {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for token refresh
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const { refreshToken, updateToken } = useAuthStore.getState();
        
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const refreshUrl = API_BASE_URL ? `${API_BASE_URL}/api/v1/auth/refresh` : '/api/v1/auth/refresh';
        const response = await axios.post(refreshUrl, {
          refreshToken
        });

        const { accessToken } = response.data.data;
        updateToken(accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return client(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default client;

