'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { AppSidebar } from '../../components/AppSidebar';
import { 
  FileTextIcon, 
  CircleCheckIcon, 
  ClockIcon, 
  DollarSignIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ArrowUpRightIcon,
  DownloadIcon
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    setToken(typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  }, []);

  const fetchStats = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/reports/statistics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch statistics', e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchRecent = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8000/api/invoices', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecentInvoices(data.slice(0, 5));
      }
    } catch (e) {
      console.error('Failed to fetch invoices', e);
    }
  }, [token]);

  useEffect(() => {
    fetchStats();
    fetchRecent();
  }, [fetchStats, fetchRecent]);

  const exportCSV = async () => {
    if (!token) return;
    const res = await fetch('http://localhost:8000/api/reports/export/invoices?format=csv', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices_export_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const exportJSON = async () => {
    if (!token) return;
    const res = await fetch('http://localhost:8000/api/reports/export/invoices?format=json', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoices_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const statusCounts = stats?.status_breakdown || {};
  const totalInvoices = stats?.total_invoices || 0;
  const totalVolume = stats?.total_volume || 0;
  const avgConfidence = stats?.average_confidence || 0;
  const verifiedCount = stats?.verified_count || 0;

  const statCards = [
    {
      title: 'Total Invoices',
      value: totalInvoices.toLocaleString(),
      icon: FileTextIcon,
      color: 'brand',
    },
    {
      title: 'Verified',
      value: verifiedCount.toLocaleString(),
      icon: CircleCheckIcon,
      color: 'success',
    },
    {
      title: 'Pending Review',
      value: (statusCounts.review || 0).toLocaleString(),
      icon: ClockIcon,
      color: 'warn',
    },
    {
      title: 'Total Amount',
      value: `$${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
      icon: DollarSignIcon,
      color: 'brand',
    },
  ];

  const statDetailCards = [
    {
      title: 'Average Confidence',
      value: `${avgConfidence}%`,
      icon: DollarSignIcon,
      color: 'brand',
    },
  ];

  const monthlyData = [
    { month: 'Jan', invoices: 0, approved: 0 },
    { month: 'Feb', invoices: 0, approved: 0 },
    { month: 'Mar', invoices: 0, approved: 0 },
    { month: 'Apr', invoices: 0, approved: 0 },
    { month: 'May', invoices: 0, approved: 0 },
    { month: 'Jun', invoices: 0, approved: 0 },
  ];

  const statusData = [
    { name: 'Approved', value: statusCounts.approved || 0, color: '#22c55e' },
    { name: 'Review', value: statusCounts.review || 0, color: '#f59e0b' },
    { name: 'Error', value: statusCounts.error || 0, color: '#ef4444' },
    { name: 'Processing', value: statusCounts.processing || 0, color: '#f59e0b' },
    { name: 'Uploaded', value: statusCounts.uploaded || 0, color: '#94a3b8' },
  ].filter((item) => item.value > 0);

  const bgColorFor = (color: string) => {
    if (color === 'brand') return 'bg-brand-50';
    if (color === 'success') return 'bg-success-50';
    if (color === 'warn') return 'bg-warn-50';
    return 'bg-brand-50';
  };
  const iconColorFor = (color: string) => {
    if (color === 'brand') return 'text-brand-700';
    if (color === 'success') return 'text-success-700';
    if (color === 'warn') return 'text-warn-700';
    return 'text-brand-700';
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas font-sans text-ink-900">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-white">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div>
              <h1 className="text-lg font-semibold text-ink-900">Analytics</h1>
              <p className="text-sm text-ink-500">Invoice processing insights and metrics</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportCSV}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-white text-sm font-medium text-ink-700 hover:bg-canvas transition-colors"
              >
                <DownloadIcon className="h-4 w-4" />
                Export CSV
              </button>
              <button
                onClick={exportJSON}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-line bg-white text-sm font-medium text-ink-700 hover:bg-canvas transition-colors"
              >
                <DownloadIcon className="h-4 w-4" />
                Export JSON
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
          <div className="mx-auto max-w-7xl space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {statCards.map((stat, i) => {
                const bgColor = bgColorFor(stat.color);
                const iconColor = iconColorFor(stat.color);
                return (
                  <div key={stat.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
                        <stat.icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-semibold text-ink-900">{stat.value}</p>
                      <p className="mt-1 text-sm text-ink-500">{stat.title}</p>
                    </div>
                  </div>
                );
              })}
              {statDetailCards.map((stat, i) => {
                const bgColor = bgColorFor(stat.color);
                const iconColor = iconColorFor(stat.color);
                return (
                  <div key={stat.title} className="rounded-lg border border-line bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor}`}>
                        <stat.icon className={`h-5 w-5 ${iconColor}`} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-2xl font-semibold text-ink-900">{stat.value}</p>
                      <p className="mt-1 text-sm text-ink-500">{stat.title}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Monthly Trends */}
              <div className="rounded-lg border border-line bg-white shadow-sm">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-base font-semibold text-ink-900">Monthly Trends</h2>
                  <p className="mt-1 text-sm text-ink-500">Invoices processed vs approved</p>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e7ec" />
                      <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#475467' }} />
                      <YAxis tick={{ fontSize: 12, fill: '#475467' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e7ec', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="invoices" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Total" />
                      <Bar dataKey="approved" fill="#22c55e" radius={[4, 4, 0, 0]} name="Approved" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Status Distribution */}
              <div className="rounded-lg border border-line bg-white shadow-sm">
                <div className="border-b border-line px-5 py-4">
                  <h2 className="text-base font-semibold text-ink-900">Status Distribution</h2>
                  <p className="mt-1 text-sm text-ink-500">Current invoice status breakdown</p>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <ResponsiveContainer width="60%" height={250}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e7ec', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="w-40 space-y-3">
                      {statusData.map((item) => (
                        <div key={item.name} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-xs text-ink-600">{item.name}</span>
                          </div>
                          <span className="text-xs font-medium text-ink-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="rounded-lg border border-line bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-line px-5 py-4">
                <div>
                  <h2 className="text-base font-semibold text-ink-900">Recent Invoices</h2>
                  <p className="mt-1 text-sm text-ink-500">Latest invoice activity</p>
                </div>
                <Link href="/" className="flex items-center gap-1 text-sm text-brand-700 hover:text-brand-600 font-medium">
                  View all
                  <ArrowUpRightIcon className="h-4 w-4" />
                </Link>
              </div>
              {loading && <div className="px-5 py-4 text-sm text-ink-500">Loading…</div>}
              {!loading && recentInvoices.length === 0 && <div className="px-5 py-4 text-sm text-ink-500">No invoices found</div>}
              {!loading && recentInvoices.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-line">
                        <th className="px-5 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">Invoice</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">Vendor</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">Amount</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-left text-xs font-medium text-ink-500 uppercase tracking-wide">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {recentInvoices.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-canvas/50 transition-colors">
                          <td className="px-5 py-4 text-sm font-medium text-ink-900">{inv.invoice_number || '-'}</td>
                          <td className="px-5 py-4 text-sm text-ink-700">{inv.vendor_name || '-'}</td>
                          <td className="px-5 py-4 text-sm font-medium text-ink-900 tabular-nums">{inv.total_amount != null ? `$${inv.total_amount}` : '-'}</td>
                          <td className="px-5 py-4">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              inv.status === 'approved' ? 'bg-success-50 text-success-700' :
                              inv.status === 'review' ? 'bg-warn-50 text-warn-700' :
                              'bg-canvas text-ink-700'
                            }`}>
                              {inv.status}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-sm text-ink-500">{inv.invoice_date ? inv.invoice_date.split('T')[0] : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
