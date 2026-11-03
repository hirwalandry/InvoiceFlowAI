'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '../../components/Button';
import { API_ENDPOINTS } from '../../config/api';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        router.push('/dashboard');
      } else {
        setError(data.detail || 'Login failed');
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        setError('Request timed out. Is the backend running on http://localhost:8000?');
      } else {
        setError('Network error - backend may be down');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink-900 mb-2">InvoiceFlow AI</h1>
          <p className="text-sm text-ink-500">Sign in to your account</p>
        </div>
        
        <div className="bg-white rounded-lg border border-line shadow-sm p-6">
          {error && <div className="mb-4 p-3 bg-error-50 text-error-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="you@company.com" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-10 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="Enter your password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-400 hover:text-ink-600">{showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</button>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Signing in...' : 'Sign in'}</Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-ink-500">Don't have an account? <Link href="/signup" className="text-brand-700 hover:text-brand-600 font-medium">Sign up</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}