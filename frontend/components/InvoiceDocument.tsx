import React from 'react';
import { DocumentRegion } from './DocumentRegion';
import type { RegionHandlers } from '../types/invoice';

export interface ExtractedField {
  id: string;
  label: string;
  value?: string | null;
}

export interface InvoiceLineItem {
  id?: string;
  description?: string | null;
  quantity?: number | null;
  unit_price?: number | null;
  amount?: number | null;
}

export interface InvoiceDetail {
  id: string;
  vendor_name?: string | null;
  vendor_address?: string | null;
  vendor_email?: string | null;
  invoice_number?: string | null;
  invoice_date?: string | null;
  due_date?: string | null;
  total_amount?: number | null;
  currency?: string | null;
  extracted_data?: Record<string, any> | null;
  line_items?: InvoiceLineItem[];
}

interface InvoiceDocumentProps {
  regions: RegionHandlers;
  invoice?: InvoiceDetail;
  fields?: ExtractedField[];
  lineItems?: InvoiceLineItem[];
}

function fmt(value: number | null | undefined, currency = 'USD'): string {
  if (value == null) return '-';
  return `${currency} ${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InvoiceDocument({ regions, invoice, fields, lineItems }: InvoiceDocumentProps) {
  const currency = invoice?.currency ?? 'USD';
  const vendorName = invoice?.vendor_name ?? '';
  const vendorAddress = invoice?.vendor_address ?? '';
  const vendorEmail = invoice?.vendor_email ?? '';
  const invoiceNumber = invoice?.invoice_number ?? '';

  const fieldMap = new Map(
    (fields ?? []).map((f) => [f.id, f.value ?? null])
  );
  const subtotal = fieldMap.get('subtotal') ?? null;
  const taxAmount = fieldMap.get('tax_amount') ?? null;
  const dueDateField = fieldMap.get('due_date') ?? null;
  const invoiceDateField = fieldMap.get('invoice_date') ?? null;
  const shipToName = fieldMap.get('ship_to_name') ?? null;
  const shipToAddress = fieldMap.get('ship_to_address') ?? null;
  const billToName = fieldMap.get('bill_to_name') ?? null;
  const billToAddress = fieldMap.get('bill_to_address') ?? null;
  const sendPaymentName = fieldMap.get('send_payment_name') ?? null;
  const sendPaymentAddress = fieldMap.get('send_payment_address') ?? null;
  const remitName = fieldMap.get('remit_name') ?? null;
  const remitAddress = fieldMap.get('remit_address') ?? null;
  const termsAndConditions = fieldMap.get('terms_and_conditions') ?? null;

  const invoiceDateRaw = invoice?.invoice_date ?? invoiceDateField ?? '-';
  const dueDateRaw = invoice?.due_date ?? dueDateField ?? '-';
  const invoiceDate = invoiceDateRaw ? String(invoiceDateRaw).split('T')[0] : '-';
  const dueDate = dueDateRaw ? String(dueDateRaw).split('T')[0] : '-';
  const totalDue = invoice?.total_amount ?? null;

  const items: InvoiceLineItem[] = lineItems ?? invoice?.line_items ?? [];
console.log('InvoiceDocument items:', fields);
  return (
    <article
      aria-label="Original invoice document"
      className="mx-auto w-full max-w-[620px] bg-white px-6 py-8 text-[12px] leading-relaxed text-ink-800 shadow-paper sm:px-10 sm:py-10">
      
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <svg aria-hidden viewBox="0 0 40 40" className="h-9 w-9">
            <rect x="14" y="2" width="12" height="12" transform="rotate(45 20 8)" fill="#1e40af" />
            <rect x="4" y="13" width="12" height="12" transform="rotate(45 10 19)" fill="#2563eb" />
            <rect x="24" y="13" width="12" height="12" transform="rotate(45 30 19)" fill="#3b82f6" />
            <rect x="14" y="24" width="12" height="12" transform="rotate(45 20 30)" fill="#1d4ed8" />
          </svg>
          <div className="leading-none">
            <p className="text-[17px] font-bold tracking-wide text-ink-900">{vendorName || 'Invoice'}</p>
            <p className="mt-1 text-[8px] tracking-[0.35em] text-ink-600">{vendorAddress || ''}</p>
          </div>
        </div>
        <p className="text-[22px] font-light tracking-[0.12em] text-ink-700">INVOICE</p>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="space-y-1">
          <DocumentRegion id="vendorName" regions={regions} fields={fields} className="w-fit">
            <p className="font-semibold text-ink-900">{vendorName}</p>
          </DocumentRegion>
          {fields && fields[1].value && (
            <DocumentRegion id="vendorAddress" regions={regions} fields={fields} className="w-fit">
              <p>{fields[1].value}</p>
            </DocumentRegion>
          )}
          {vendorEmail && (
            <DocumentRegion id="vendorEmail" regions={regions} fields={fields} className="w-fit">
              <p>{vendorEmail}</p>
            </DocumentRegion>
          )}
        </div>
        {shipToName && (
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Ship To</p>
            <DocumentRegion id="ship_to_name" regions={regions} fields={fields} className="w-fit">
              <p>{shipToName}</p>
            </DocumentRegion>
            {shipToAddress && (
              <DocumentRegion id="ship_to_address" regions={regions} fields={fields} className="w-fit">
                <p>{shipToAddress}</p>
              </DocumentRegion>
            )}
          </div>
        )}
        {billToName && (
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Bill To</p>
            <DocumentRegion id="bill_to_name" regions={regions} fields={fields} className="w-fit">
              <p>{billToName}</p>
            </DocumentRegion>
            {billToAddress && (
              <DocumentRegion id="bill_to_address" regions={regions} fields={fields} className="w-fit">
                <p>{billToAddress}</p>
              </DocumentRegion>
            )}
          </div>
        )}
        {sendPaymentName && (
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Send Payment To</p>
            <DocumentRegion id="send_payment_name" regions={regions} fields={fields} className="w-fit">
              <p>{sendPaymentName}</p>
            </DocumentRegion>
            {sendPaymentAddress && (
              <DocumentRegion id="send_payment_address" regions={regions} fields={fields} className="w-fit">
                <p>{sendPaymentAddress}</p>
              </DocumentRegion>
            )}
          </div>
        )}
        {remitName && (
          <div className="space-y-1">
            <p className="font-semibold text-ink-900">Remit To</p>
            <DocumentRegion id="remit_name" regions={regions} fields={fields} className="w-fit">
              <p>{remitName}</p>
            </DocumentRegion>
            {remitAddress && (
              <DocumentRegion id="remit_address" regions={regions} fields={fields} className="w-fit">
                <p>{remitAddress}</p>
              </DocumentRegion>
            )}
          </div>
        )}
        <dl className="grid grid-cols-[auto_auto] items-center gap-x-6 gap-y-2">
          <dt className="font-semibold text-ink-900">Invoice #</dt>
          <dd>
            <DocumentRegion id="invoiceNumber" regions={regions} fields={fields} className="w-fit">
              {invoiceNumber}
            </DocumentRegion>
          </dd>
          <dt className="font-semibold text-ink-900">Invoice Date</dt>
          <dd>
            <DocumentRegion id="invoiceDate" regions={regions} fields={fields} className="w-fit">
              {invoiceDate}
            </DocumentRegion>
          </dd>
          <dt className="font-semibold text-ink-900">Due Date</dt>
          <dd>
            <DocumentRegion id="dueDate" regions={regions} fields={fields} className="w-fit">
              {dueDate}
            </DocumentRegion>
          </dd>
        </dl>
      </div>

      <div className="mt-8">
        <div className="grid grid-cols-[minmax(0,1fr)_32px_76px_80px] gap-2 bg-canvas px-2 py-2 text-[10.5px] font-semibold uppercase tracking-wide text-ink-700">
          <span>Description</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit price</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="mt-1 space-y-1">
          {items.map((row, index) => (
            <DocumentRegion
              key={`line-${index}`}
              id={`line-${index}`}
              regions={regions}
              fields={fields}
              className="grid grid-cols-[minmax(0,1fr)_32px_76px_80px] gap-2 px-2 py-2 tabular-nums">
              <span className="truncate">{row.description}</span>
              <span className="text-right">{row.quantity ?? 0}</span>
              <span className="text-right">{fmt(row.unit_price, currency)}</span>
              <span className="text-right">{fmt(row.amount, currency)}</span>
            </DocumentRegion>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t-2 border-ink-400/50 pt-4">
        <dl className="ml-auto grid w-full max-w-[260px] grid-cols-[1fr_auto] items-center gap-x-6 gap-y-2 tabular-nums">
          <dt className="font-semibold text-ink-900">Subtotal</dt>
          <dd className="text-right">
            <DocumentRegion id="subtotal" regions={regions} fields={fields} className="ml-auto w-fit">
              {subtotal != null ? fmt(Number(subtotal), currency) : '-'}
            </DocumentRegion>
          </dd>
          <dt>Tax</dt>
          <dd className="text-right">
            <DocumentRegion id="tax" regions={regions} fields={fields} className="ml-auto w-fit">
              {taxAmount != null ? fmt(Number(taxAmount), currency) : '-'}
            </DocumentRegion>
          </dd>
          <dt className="mt-1 border-t border-line pt-2.5 font-semibold text-ink-900">Total Due</dt>
          <dd className="mt-1 border-t border-line pt-2.5 text-right">
            <DocumentRegion id="totalDue" regions={regions} fields={fields} className="ml-auto w-fit text-[13px] font-semibold text-ink-900">
              {totalDue != null ? fmt(totalDue, currency) : '-'}
            </DocumentRegion>
          </dd>
        </dl>
      </div>
      {termsAndConditions && (
        <div className="mt-6 border-t-2 border-ink-400/50 pt-4">
          <dt className="font-semibold text-ink-900">Terms & Conditions</dt>
          <dd className="text-[11px] text-ink-600">
            <DocumentRegion id="terms_and_conditions" regions={regions} fields={fields}>
              <p>{termsAndConditions}</p>
            </DocumentRegion>
          </dd>
        </div>
      )}
      
    </article>
  );
}
