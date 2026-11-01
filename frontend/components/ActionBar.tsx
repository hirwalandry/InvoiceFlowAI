import React from 'react';
import { CheckIcon, FileSpreadsheetIcon, FileTextIcon, Loader2Icon, ShieldCheckIcon } from 'lucide-react';
import { Button } from './Button';
import type { SyncState } from '../types/invoice';
import type { ExportFormat } from '../utils/export';

interface ActionBarProps {
  needsReviewCount: number;
  syncState: SyncState;
  onApprove: () => void;
  onExport: (format: ExportFormat) => void;
}

export function ActionBar({ needsReviewCount, syncState, onApprove, onExport }: ActionBarProps) {
  const blocked = needsReviewCount > 0;

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-white px-4 py-3 sm:px-6">
      <div className="hidden items-center gap-3 md:flex">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50">
          <ShieldCheckIcon aria-hidden className="h-[18px] w-[18px] text-brand-600" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink-900">Source-grounded review</p>
          <p className="text-xs text-ink-500">Every value is traceable to the original document.</p>
        </div>
      </div>

      <div className="flex w-full flex-wrap items-center justify-end gap-2 md:w-auto">
        {blocked && syncState === 'idle' &&
        <p className="mr-1 text-xs text-warn-700" id="approve-hint">
            Resolve {needsReviewCount} flagged {needsReviewCount === 1 ? 'field' : 'fields'} to approve
          </p>
        }
        <Button onClick={() => onExport('csv')}>
          <FileTextIcon aria-hidden className="h-4 w-4 text-ink-500" />
          Export CSV
        </Button>
        <Button onClick={() => onExport('excel')}>
          <FileSpreadsheetIcon aria-hidden className="h-4 w-4 text-ink-500" />
          Export Excel
        </Button>
        <Button onClick={() => onExport('pdf')}>
          <FileTextIcon aria-hidden className="h-4 w-4 text-ink-500" />
          Export PDF
        </Button>
        <Button
          variant="primary"
          onClick={onApprove}
          disabled={blocked || syncState !== 'idle'}
          aria-describedby={blocked ? 'approve-hint' : undefined}
          className={syncState === 'synced' ? 'disabled:bg-success-500' : ''}>
          
          {syncState === 'syncing' && <Loader2Icon aria-hidden className="h-4 w-4 animate-spin" />}
          {syncState === 'synced' && <CheckIcon aria-hidden className="h-4 w-4" />}
          {syncState === 'idle' && 'Approve & Sync to QuickBooks'}
          {syncState === 'syncing' && 'Syncing to QuickBooks…'}
          {syncState === 'synced' && 'Synced to QuickBooks'}
        </Button>
      </div>
    </footer>);

}