'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !email.trim() || !password.trim()) {
      setError('All fields are required');
      return;
    }

    try {
      await api.post('/api/register', { username, email, password });
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="w-full max-w-sm px-6 py-8 bg-white rounded-xl">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">
          Register
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
              className="px-4 py-2 text-gray-800 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <div className="flex flex-col">
            <label className="text-gray-600 text-sm mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="px-4 py-2 text-gray-800 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
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
              className="px-4 py-2 text-gray-800 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-2 bg-green-500 text-white font-medium rounded hover:bg-green-600 transition"
          >
            Register
          </button>
        </form>

        <div className="mt-6 text-center space-y-2 text-sm text-gray-500">
          <p>
            Already have an account?{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-blue-500 underline"
            >
              Login
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
