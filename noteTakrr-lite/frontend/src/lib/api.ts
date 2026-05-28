import axios from 'axios';
import { supabase } from './supabase';

export const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Intercept requests to automatically attach the Supabase access token
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  
  return config;
}, (error) => {
  return Promise.reject(error);
});
