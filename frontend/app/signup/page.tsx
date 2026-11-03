'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MailIcon, LockIcon, UserIcon, BuildingIcon, EyeIcon, EyeOffIcon } from 'lucide-react';
import { Button } from '../../components/Button';
import { API_ENDPOINTS } from '../../config/api';

export default function SignupPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API_ENDPOINTS.auth.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          full_name: formData.fullName,
          password: formData.password,
          company_name: formData.company
        })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('token', data.access_token);
        router.push('/dashboard');
      } else {
        setError(data.detail || 'Signup failed');
      }
    } catch (err) {
      setError('Network error - backend may be down');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-ink-900 mb-2">InvoiceFlow AI</h1>
          <p className="text-sm text-ink-500">Create your account</p>
        </div>
        
        <div className="bg-white rounded-lg border border-line shadow-sm p-6">
          {error && <div className="mb-4 p-3 bg-error-50 text-error-700 rounded-md text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-ink-700 mb-1.5">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="fullName" type="text" required value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="John Doe" />
              </div>
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink-700 mb-1.5">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="email" type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="you@company.com" />
              </div>
            </div>
            <div>
              <label htmlFor="company" className="block text-sm font-medium text-ink-700 mb-1.5">Company Name</label>
              <div className="relative">
                <BuildingIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="company" type="text" required value={formData.company} onChange={(e) => setFormData({...formData, company: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="Acme Corp" />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink-700 mb-1.5">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="password" type={showPassword ? 'text' : 'password'} required value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-10 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="Create a password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-ink-400 hover:text-ink-600">{showPassword ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}</button>
              </div>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-ink-700 mb-1.5">Confirm Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-ink-400" />
                <input id="confirmPassword" type="password" required value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} className="w-full pl-10 pr-3 py-2 border border-line rounded-md text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent" placeholder="Confirm your password" />
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? 'Creating account...' : 'Create account'}</Button>
          </form>
          <div className="mt-6 text-center">
            <p className="text-sm text-ink-500">Already have an account? <Link href="/login" className="text-brand-700 hover:text-brand-600 font-medium">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
}