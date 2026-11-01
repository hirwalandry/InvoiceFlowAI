import type { ExtractedField, FieldSectionMeta } from '../types/invoice';

export const REVIEW_THRESHOLD = 90;

export const invoiceMeta = {
  number: 'INV-2026-0417',
  vendor: 'Nexora Solutions LLC',
  fileName: 'INV-2026-0417.pdf',
  receivedAt: 'May 28, 2026',
  receivedVia: 'ap@acmecorp.com',
  destination: 'QuickBooks Online'
};

export const fieldSections: FieldSectionMeta[] = [
{ id: 'details', title: 'Invoice details' },
{ id: 'lineItems', title: 'Line items' },
{ id: 'totals', title: 'Totals' },
{ id: 'vendor', title: 'Vendor' },
{ id: 'remitTo', title: 'Remit to' }];


export const extractedFields: ExtractedField[] = [
{ id: 'invoiceNumber', section: 'details', label: 'Invoice number', value: 'INV-2026-0417', confidence: 95, sourceLabel: 'Invoice #' },
{ id: 'invoiceDate', section: 'details', label: 'Invoice date', value: 'May 28, 2026', confidence: 98, sourceLabel: 'Invoice Date' },
{ id: 'dueDate', section: 'details', label: 'Due date', value: 'Jun 27, 2026', confidence: 96, sourceLabel: 'Due Date' },
{ id: 'line1', section: 'lineItems', label: 'Cloud Infrastructure Upgrade', value: '$10,000.00', confidence: 94, sourceLabel: 'Cloud Infrastructure Upgrade', lineItem: { qty: 2, unitPrice: '$5,000.00' } },
{ id: 'line2', section: 'lineItems', label: 'Data Integration & ETL', value: '$2,400.00', confidence: 92, sourceLabel: 'Data Integration & ETL', lineItem: { qty: 1, unitPrice: '$2,400.00' } },
{ id: 'line3', section: 'lineItems', label: 'Security Assessment', value: '$1,500.00', confidence: 94, sourceLabel: 'Security Assessment', lineItem: { qty: 1, unitPrice: '$1,500.00' } },
{ id: 'subtotal', section: 'totals', label: 'Subtotal', value: '$13,900.00', confidence: 96, sourceLabel: 'Subtotal' },
{ id: 'tax', section: 'totals', label: 'Tax (8.25%)', value: '$1,146.75', confidence: 93, sourceLabel: 'Tax (8.25%)' },
{ id: 'totalDue', section: 'totals', label: 'Total due', value: '$15,046.75', confidence: 95, sourceLabel: 'Total Due' },
{ id: 'vendorName', section: 'vendor', label: 'Name', value: 'Nexora Solutions LLC', confidence: 97, sourceLabel: 'Vendor name' },
{ id: 'vendorAddress', section: 'vendor', label: 'Address', value: '123 Innovation Way, Suite 400\nAustin, TX 78701', confidence: 84, sourceLabel: 'Vendor address' },
{ id: 'vendorEmail', section: 'vendor', label: 'Email', value: 'support@nexorasolutions.com', confidence: 91, sourceLabel: 'Vendor email' },
{ id: 'remitName', section: 'remitTo', label: 'Name', value: 'Nexora Solutions LLC', confidence: 95, sourceLabel: 'Remit To' },
{ id: 'remitAddress', section: 'remitTo', label: 'Address', value: 'PO Box 98765\nAustin, TX 78701', confidence: 72, sourceLabel: 'Remit To address' }];