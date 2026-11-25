import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LockKeyhole } from 'lucide-react';
import useAuthStore from '@/store/authStore';
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';

export default function AdminLogin() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const login = useAuthStore((s) => s.login);
  const loading = useAuthStore((s) => s.loading);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login({
      name: name.trim(),
      password,
    });

    if (!result.success) {
      toast({
        title: 'Login failed',
        description: result.message || 'Invalid admin name or password',
        variant: 'destructive',
      });
      return;
    }

    const user = useAuthStore.getState().user;
    if (user?.role !== 'admin') {
      await useAuthStore.getState().logout();
      toast({
        title: 'Access denied',
        description: 'This account is not an admin. Use the store login for customers.',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: 'Welcome back', description: 'Signed in to MotoGear Admin.' });
    navigate('/admin', { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
      <Toaster />
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-600/20 text-red-500">
            <LockKeyhole size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">MotoGear Admin</h1>
            <p className="text-sm text-gray-400">Sign in to manage the store</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="admin-name" className="mb-2 block text-sm font-medium text-gray-300">
              Admin name
            </label>
            <input
              id="admin-name"
              type="text"
              name="name"
              autoComplete="username"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none"
              placeholder="admin"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-password" className="mb-2 block text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              name="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-950 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-red-500 focus:outline-none"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link to="/" className="text-gray-400 transition-colors hover:text-white">
            ← Back to store
          </Link>
        </p>
      </div>
    </div>
  );
}