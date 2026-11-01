import React from "react";
import { ChevronRightIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";

interface ReviewHeaderProps {
  needsReviewCount: number;
  syncState: string;
  invoice?: any;
}

export function ReviewHeader({ needsReviewCount, syncState, invoice }: ReviewHeaderProps) {
  const status =
    syncState === 'synced'
      ? { label: 'Synced', className: 'bg-success-50 text-success-700', dot: 'bg-success-500' }
      : needsReviewCount > 0
        ? {
            label: `${needsReviewCount} ${needsReviewCount === 1 ? 'field needs' : 'fields need'} review`,
            className: 'bg-warn-50 text-warn-700',
            dot: 'bg-warn-500',
          }
        : { label: 'Ready to sync', className: 'bg-brand-50 text-brand-700', dot: 'bg-brand-500' };

  const displayNumber = invoice?.invoice_number || invoice?.id || 'Invoices';
  const displayVendor = invoice?.vendor_name || 'Invoices';
  const displayDate = invoice?.invoice_date ? String(invoice.invoice_date).split('T')[0] : '';
  const displayVia = invoice?.vendor_email || '';

  return (
    <header className="border-b border-line bg-white">
      <div className="flex h-14 items-center border-b border-line px-4 lg:hidden">
        <BrandMark />
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 py-4 sm:px-6">
        <div className="min-w-0">
          {invoice && (
            <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-ink-500">
              <a href="#" className="hover:text-ink-900">Review queue</a>
              <ChevronRightIcon aria-hidden className="h-3 w-3" />
              <span aria-current="page" className="text-ink-700">{invoice.invoice_number || displayNumber}</span>
            </nav>
          )}
          <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-ink-900">{displayVendor}</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {displayDate ? `Received ${displayDate}${displayVia ? ' via ' + displayVia : ''}` : 'Received invoices'}
          </p>
        </div>
        <span className={`inline-flex h-7 items-center gap-2 rounded-full px-3 text-xs font-medium ${status.className}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
      </div>
    </header>
  );
}
