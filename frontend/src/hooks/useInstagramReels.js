import { useEffect, useState } from 'react';
import api from '@/api/axiosInstance';

export function useInstagramReels() {
  const [reels, setReels] = useState([]);
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await api.get('/instagram/reels');
        if (!active) return;
        setConfigured(Boolean(res.data?.configured));
        setReels(Array.isArray(res.data?.reels) ? res.data.reels : []);
        setError('');
      } catch (err) {
        if (!active) return;
        setReels([]);
        setError(err.response?.data?.message || 'Could not load Instagram reels');
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  return { reels, configured, loading, error };
}