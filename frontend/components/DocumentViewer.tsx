"use client";

import React, { useEffect, useState } from 'react';
import { FileTextIcon, MinusIcon, PlusIcon, ScanIcon } from 'lucide-react';
import { InvoiceDocument } from './InvoiceDocument';
import type { RegionHandlers, ExtractedField } from '../types/invoice';
import { API_ENDPOINTS } from '../config/api';

interface DocumentViewerProps {
  regions: RegionHandlers;
  invoiceId?: string | null;
}

const MIN_ZOOM = 50;
const MAX_ZOOM = 175;
const STEP = 25;

export function DocumentViewer({ regions, invoiceId }: DocumentViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!invoiceId) {
      setInvoice(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    fetch(API_ENDPOINTS.invoices.byId(invoiceId), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load invoice');
        return res.json();
      })
      .then((data) => {
        setInvoice(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [invoiceId]);

  const toolButton =
    'flex h-7 w-7 items-center justify-center rounded-md text-white/80 transition-colors duration-150 hover:bg-white/10 hover:text-white disabled:opacity-40 disabled:hover:bg-transparent focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-200';

  if (loading) {
    return (
      <section className="overflow-hidden rounded-xl border border-line bg-viewer xl:sticky xl:top-0">
        <div className="flex h-full items-center justify-center text-sm text-ink-500">Loading document…</div>
      </section>
    );
  }

  if (error || !invoice) {
    return (
      <section className="overflow-hidden rounded-xl border border-line bg-viewer xl:sticky xl:top-0">
        <div className="flex h-full items-center justify-center text-sm text-ink-500">
          {error || 'No document selected'}
        </div>
      </section>
    );
  }

  const extracted: ExtractedField[] = Array.isArray(invoice.extracted_data?.fields)
    ? invoice.extracted_data.fields
    : [];

  return (
    <section
      aria-label="Source document"
      className="overflow-hidden rounded-xl border border-line bg-viewer xl:sticky xl:top-0"
    >
      <div className="flex h-11 items-center justify-between gap-3 bg-toolbar px-3">
        <p className="flex min-w-0 items-center gap-2 text-xs text-white/90">
          <FileTextIcon aria-hidden className="h-3.5 w-3.5 shrink-0 text-white/60" />
          <span className="truncate">{invoice.filename}</span>
          <span className="text-white/50">· {invoice.status}</span>
        </p>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Zoom out"
            className={toolButton}
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - STEP))}
          >
            <MinusIcon className="h-3.5 w-3.5" />
          </button>
          <span aria-live="polite" className="w-11 text-center text-xs tabular-nums text-white/90">
            {zoom}%
          </span>
          <button
            type="button"
            aria-label="Zoom in"
            className={toolButton}
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + STEP))}
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
          <span aria-hidden className="mx-1 h-4 w-px bg-white/15" />
          <button type="button" aria-label="Fit to width" className={toolButton} onClick={() => setZoom(100)}>
            <ScanIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="max-h-[72vh] overflow-auto p-4 sm:p-6 xl:max-h-[calc(100vh-16.5rem)]">
        <div style={{ zoom: zoom / 100 }}>
          <InvoiceDocument
            regions={regions}
            invoice={invoice}
            fields={extracted}
          />
        </div>
      </div>
    </section>
  );
}
