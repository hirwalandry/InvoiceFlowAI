import React from 'react';
import { twMerge } from 'tailwind-merge';
import type { RegionHandlers } from '../types/invoice';

export interface ExtractedField {
  id: string;
  label: string;
  value?: string | null;
}

interface DocumentRegionProps {
  id: string;
  regions: RegionHandlers;
  fields?: ExtractedField[];
  className?: string;
  children: React.ReactNode;
}

export function DocumentRegion({ id, regions, fields, className, children }: DocumentRegionProps) {
  const field = fields?.find((f) => f.id === id);
  const isSelected = regions.selectedId === id;
  const isHovered = !isSelected && regions.hoveredId === id;
  const label = field?.label ?? id;

  return (
    <div
      role="button"
      tabIndex={0}
      data-region={id}
      aria-pressed={isSelected}
      aria-label={`Review extracted field: ${label}`}
      onClick={() => regions.onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          regions.onSelect(id);
        }
      }}
      onMouseEnter={() => regions.onHover(id)}
      onMouseLeave={() => regions.onHover(null)}
      className={twMerge(
        'cursor-pointer rounded-[3px] outline outline-2 outline-offset-2 outline-transparent transition-[outline-color,background-color] duration-150 ease-out focus-visible:outline-brand-500',
        isSelected && 'bg-brand-50 outline-brand-500',
        isHovered && 'bg-warn-50 outline-warn-300',
        className,
      )}
    >
      {children}
    </div>
  );
}
