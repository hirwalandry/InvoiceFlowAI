import React from 'react';
import { AppSidebar } from '../../components/AppSidebar';
import { UploadZone } from '../../components/UploadZone';
import Link from 'next/link';

export default function UploadPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas font-sans text-ink-900">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="border-b border-line bg-white">
          <div className="flex h-14 items-center justify-between px-4 sm:px-6">
            <div>
              <h1 className="text-lg font-semibold text-ink-900">Upload Invoices</h1>
              <p className="text-sm text-ink-500">Upload PDF or image files to process</p>
            </div>
            <Link
              href="/dashboard"
              className="flex items-center gap-1 text-sm text-brand-700 hover:text-brand-600 font-medium"
            >
              Back to Review Queue
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-4xl">
            <UploadZone />
          </div>
        </main>
      </div>
    </div>
  );
}
