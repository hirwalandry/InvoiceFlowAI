import React from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { fieldSections } from '../data/invoice';
import { FieldRow } from './FieldRow';
import { FieldReview } from './FieldReview';
import type { ExtractedField, FieldStatus } from '../types/invoice';

interface ExtractedFieldsPanelProps {
  fields: ExtractedField[];
  values: Record<string, string>;
  statuses: Record<string, FieldStatus>;
  selectedId: string | null;
  hoveredId: string | null;
  averageConfidence: number;
  needsReviewCount: number;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onAccept: (id: string) => void;
  onSave: (id: string, value: string) => void;
  onReviewNext: () => void;
}

export function ExtractedFieldsPanel({
  fields,
  values,
  statuses,
  selectedId,
  hoveredId,
  averageConfidence,
  needsReviewCount,
  onSelect,
  onHover,
  onAccept,
  onSave,
  onReviewNext
}: ExtractedFieldsPanelProps) {
  return (
    <section aria-labelledby="extracted-heading" className="overflow-hidden rounded-xl border border-line bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <div>
          <h2 id="extracted-heading" className="text-sm font-semibold text-ink-900">
            Extracted fields
          </h2>
          <p className="text-xs text-ink-500">{fields.length} fields · select any field to see its source</p>
        </div>
        <p className="rounded-full bg-success-50 px-2.5 py-1 text-xs">
          <span className="font-semibold tabular-nums text-success-700">{averageConfidence}%</span>{' '}
          <span className="text-ink-600">average confidence</span>
        </p>
      </header>

      {needsReviewCount > 0 &&
      <div className="flex items-center justify-between gap-3 border-b border-warn-300/40 bg-warn-50 px-4 py-2.5">
          <p className="text-xs text-warn-700">
            <span className="font-semibold">{needsReviewCount} low-confidence {needsReviewCount === 1 ? 'field' : 'fields'}</span>{' '}
            must be resolved before syncing.
          </p>
          <button
          type="button"
          onClick={onReviewNext}
          className="flex shrink-0 items-center gap-1 rounded text-xs font-semibold text-warn-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-warn-500">
          
            Review next
            <ArrowRightIcon aria-hidden className="h-3 w-3" />
          </button>
        </div>
      }

      {fieldSections.map((section) => {
        const sectionFields = fields.filter((f) => f.section === section.id);
        const isLineItems = section.id === 'lineItems';
        return (
          <div key={section.id} className="border-b border-line pb-1.5 last:border-0">
            <h3 className="px-4 pb-1 pt-3 text-xs font-semibold text-ink-700">
              {section.title}
              {isLineItems && <span className="font-normal text-ink-500"> ({sectionFields.length} items)</span>}
            </h3>
            {isLineItems &&
            <div
              aria-hidden
              className="grid grid-cols-[minmax(0,1fr)_28px_auto] gap-3 px-4 pb-1 text-[11px] text-ink-400 2xl:grid-cols-[minmax(0,1fr)_28px_80px_auto]">
              
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="hidden text-right 2xl:block">Unit price</span>
                <span className="box-content w-[76px] pr-[78px] text-right">Amount</span>
              </div>
            }
            {sectionFields.map((field) =>
            <FieldRow
              key={field.id}
              field={field}
              value={values[field.id]}
              status={statuses[field.id]}
              isSelected={selectedId === field.id}
              isHovered={hoveredId === field.id}
              onSelect={() => onSelect(field.id)}
              onHover={onHover}>
              
                <FieldReview
                field={field}
                value={values[field.id]}
                status={statuses[field.id]}
                onAccept={() => onAccept(field.id)}
                onSave={(v) => onSave(field.id, v)} />
              
              </FieldRow>
            )}
          </div>);

      })}
    </section>);

}