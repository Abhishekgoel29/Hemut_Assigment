'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const response = await api.post('/api/login', { username, password });
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('username', response.data.username);
      localStorage.setItem('is_admin', response.data.is_admin);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm px-6 py-8 bg-white rounded-xl">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">
          Login
        </h1>

        {error && (
          <p className="text-center text-red-500 mb-4 text-sm">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col">
            <label className="text-gray-600 text-sm mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              className="px-4 py-2 text-gray-800 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-600 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="px-4 py-2 text-gray-800 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-blue-500 text-white font-medium rounded hover:bg-blue-600 transition"
          >
            Login
          </button>
        </form>

        <div className="mt-6 text-center space-y-2 text-sm text-gray-500">
          <p>
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/register')}
              className="text-blue-500 underline"
            >
              Register
            </button>
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="underline hover:text-gray-700"
          >
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}
