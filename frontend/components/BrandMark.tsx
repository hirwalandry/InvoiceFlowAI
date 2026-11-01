import React from 'react';
import { FileTextIcon } from 'lucide-react';

export function BrandMark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
        <FileTextIcon aria-hidden className="h-4 w-4 text-white" strokeWidth={2.25} />
      </span>
      <span className="text-[15px] font-semibold tracking-tight text-ink-900">
        InvoiceFlow <span className="text-brand-600">AI</span>
      </span>
    </div>);

}