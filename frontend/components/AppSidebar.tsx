'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOutIcon } from 'lucide-react';
import { primaryNav, secondaryNav } from '../data/navigation';
import { BrandMark } from './BrandMark';
import { API_ENDPOINTS } from '../config/api';

interface UserInfo {
  email?: string;
  full_name?: string;
  role?: string;
}

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [invoiceCount, setInvoiceCount] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(API_ENDPOINTS.auth.me, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (e) {
        console.error('Failed to fetch user', e);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchInvoiceCount = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
      try {
        const res = await fetch(API_ENDPOINTS.invoices.list, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setInvoiceCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (e) {
        console.error('Failed to fetch invoices', e);
      }
    };
    fetchInvoiceCount();
    const interval = setInterval(fetchInvoiceCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-white lg:flex">
      <div className="flex h-16 items-center px-5">
        <BrandMark />
      </div>
      <nav aria-label="Main" className="flex flex-1 flex-col px-3 py-2">
        <ul className="space-y-0.5">
          {primaryNav.map(({ label, icon: Icon, href = '#' }) => {
            const active = pathname === href || (href !== '#' && pathname.startsWith(href));
            const isReview = label === 'Review queue';
            return (
              <li key={label}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex h-9 items-center gap-3 rounded-lg px-3 text-sm transition-colors duration-150 ${
                    active
                      ? 'bg-brand-50 font-medium text-brand-700'
                      : 'text-ink-600 hover:bg-canvas hover:text-ink-900'
                  }`}
                >
                  <Icon aria-hidden className="h-4 w-4" />
                  <span className="flex-1">{label}</span>
                  {isReview && (
                    <span className={`text-xs tabular-nums ${active ? 'text-brand-700' : 'text-ink-500'}`}>
                      {invoiceCount}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
        <ul className="mt-auto space-y-0.5 border-t border-line pt-3">
          {secondaryNav.map((item: any) => {
            const Icon = item.icon;
            return (
              <li key={item.label}>
                <a
                  href="#"
                  className="flex h-9 items-center gap-3 rounded-lg px-3 text-sm text-ink-600 transition-colors duration-150 hover:bg-canvas hover:text-ink-900">
                  {Icon && <Icon aria-hidden className="h-4 w-4" />}
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="flex items-center gap-3 border-t border-line px-5 py-4">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-800 text-xs font-semibold text-white">
          {user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'M'}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-ink-900">{user?.full_name || 'Maya Robinson'}</p>
          <p className="truncate text-xs text-ink-500">{user?.role ? `${user.role.charAt(0).toUpperCase()}${user.role.slice(1)}` : 'AP Specialist'}</p>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-5 py-4 text-sm font-medium text-ink-600 hover:bg-canvas hover:text-ink-900 transition-colors"
      >
        <LogOutIcon className="h-4 w-4" />
        <span>Logout</span>
      </button>
    </aside>
  );
}