import React from 'react';
import { REVIEW_THRESHOLD } from '../data/invoice';

interface ConfidenceBadgeProps {
  value: number;
}

export function ConfidenceBadge({ value }: ConfidenceBadgeProps) {
  const high = value >= REVIEW_THRESHOLD;
  return (
    <span
      className={`inline-flex h-5 min-w-[40px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
      high ? 'bg-success-50 text-success-700' : 'bg-warn-50 text-warn-700'}`
      }>
      
      <span className="sr-only">Confidence </span>
      {value}%
    </span>);

}