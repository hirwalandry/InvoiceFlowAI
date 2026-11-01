import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ConfidenceBadge } from './ConfidenceBadge';
import { StatusIcon } from './StatusIcon';
import type { ExtractedField, FieldStatus } from '../types/invoice';

interface FieldRowProps {
  field: ExtractedField;
  value: string;
  status: FieldStatus;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
  children: React.ReactNode;
}

export function FieldRow({ field, value, status, isSelected, isHovered, onSelect, onHover, children }: FieldRowProps) {
  const isLine = Boolean(field.lineItem);

  return (
    <div id={`field-${field.id}`} className="scroll-mt-4">
      <button
        type="button"
        aria-expanded={isSelected}
        onClick={onSelect}
        onMouseEnter={() => onHover(field.id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(field.id)}
        onBlur={() => onHover(null)}
        className={`relative grid w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-500 ${
        isLine ?
        'grid-cols-[minmax(0,1fr)_28px_auto] 2xl:grid-cols-[minmax(0,1fr)_28px_80px_auto]' :
        'grid-cols-[96px_minmax(0,1fr)_auto] sm:grid-cols-[120px_minmax(0,1fr)_auto]'} ${
        isSelected ? 'bg-brand-50' : isHovered ? 'bg-canvas' : 'bg-white'}`}>
        
        <span
          aria-hidden
          className={`absolute inset-y-0 left-0 w-0.5 transition-colors duration-150 ${isSelected ? 'bg-brand-500' : 'bg-transparent'}`} />
        
        {isLine && field.lineItem ?
        <>
            <span className="truncate text-ink-800">{field.label}</span>
            <span className="text-right tabular-nums text-ink-600">{field.lineItem.qty}</span>
            <span className="hidden text-right tabular-nums text-ink-600 2xl:block">{field.lineItem.unitPrice}</span>
          </> :

        <>
            <span className="text-ink-500">{field.label}</span>
            <span
            className={`whitespace-pre-line break-words tabular-nums ${
            field.id === 'totalDue' ? 'font-semibold text-brand-700' : 'text-ink-900'}`
            }>
            
              {value}
            </span>
          </>
        }
        <span className="flex items-center justify-end gap-2.5">
          {isLine && <span className="w-[76px] text-right tabular-nums text-ink-900">{value}</span>}
          <ConfidenceBadge value={field.confidence} />
          <StatusIcon status={status} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {isSelected &&
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
          className="overflow-hidden bg-brand-50">
          
            {children}
          </motion.div>
        }
      </AnimatePresence>
    </div>);

}