import React from 'react';
import { CircleAlertIcon, CircleCheckIcon, PencilIcon } from 'lucide-react';
import type { FieldStatus } from '../types/invoice';

const labels: Record<FieldStatus, string> = {
  verified: 'Verified',
  accepted: 'Accepted',
  edited: 'Edited',
  needsReview: 'Needs review'
};

export function StatusIcon({ status }: {status: FieldStatus;}) {
  return (
    <span className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center" title={labels[status]}>
      <span className="sr-only">{labels[status]}</span>
      {status === 'needsReview' && <CircleAlertIcon aria-hidden className="h-[18px] w-[18px] fill-warn-500 text-white" />}
      {(status === 'verified' || status === 'accepted') &&
      <CircleCheckIcon aria-hidden className="h-[18px] w-[18px] fill-success-500 text-white" />
      }
      {status === 'edited' &&
      <span aria-hidden className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-600">
          <PencilIcon className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
        </span>
      }
    </span>);

}