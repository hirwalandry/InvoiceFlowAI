'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CircleCheckIcon, TriangleAlertIcon } from 'lucide-react';
import { Button } from './Button';
import type { ExtractedField, FieldStatus } from '../types/invoice';

interface FieldReviewProps {
  field: ExtractedField;
  value: string;
  status: FieldStatus;
  onAccept: () => void;
  onSave: (value: string) => void;
}

const resolvedLabel: Record<Exclude<FieldStatus, 'needsReview'>, string> = {
  verified: 'Verified automatically',
  accepted: 'Accepted by you',
  edited: 'Edited by you'
};

export function FieldReview({ field, value, status, onAccept, onSave }: FieldReviewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const isMultiline = field.value.includes('\n');
  const inputId = `review-${field.id}`;

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const save = () => {
    const next = draft.trim();
    if (!next) return;
    onSave(next);
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const inputClass = `mt-1.5 w-full rounded-lg border px-3 py-2 text-sm text-ink-900 tabular-nums outline-none transition-[border-color,box-shadow] duration-150 ${
  isEditing ?
  'border-brand-500 bg-white ring-4 ring-brand-100' :
  'border-line bg-white/70'}`;


  const inputProps = {
    id: inputId,
    ref: inputRef,
    value: isEditing ? draft : value,
    readOnly: !isEditing,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDraft(e.target.value),
    onKeyDown: (e: React.KeyboardEvent) => {
      if (!isEditing) return;
      if (e.key === 'Escape') cancel();
      if (e.key === 'Enter' && !isMultiline) save();
    },
    className: inputClass
  };

  return (
    <div className="mx-3 mb-2 mt-1 rounded-lg border border-line bg-canvas p-3.5">
      {status === 'needsReview' &&
      <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-warn-700">
          <TriangleAlertIcon aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Confidence is below 90%. Check this value against the source before accepting.
        </p>
      }

      <label htmlFor={inputId} className="text-xs font-medium text-ink-600">
        Extracted value
      </label>
      {isMultiline ? <textarea rows={2} {...inputProps} className={`${inputClass} resize-none`} /> : <input {...inputProps} />}

      <p className="mt-3 text-xs font-medium text-ink-600">Source in document</p>
      <div className="mt-1.5 flex items-start justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-xs">
        <span className="pt-0.5 font-medium text-ink-700">{field.sourceLabel}</span>
        <span className="whitespace-pre-line rounded-sm bg-brand-50 px-1.5 py-0.5 text-right text-ink-900 tabular-nums outline outline-1 outline-brand-500">
          {field.value}
        </span>
      </div>
      {status === 'edited' && value !== field.value &&
      <p className="mt-2 text-xs text-ink-500">Your edit replaces the extracted value shown above.</p>
      }

      <div className="mt-3.5 flex flex-wrap items-center justify-end gap-2">
        {isEditing ?
        <>
            <Button size="sm" onClick={cancel}>Cancel</Button>
            <Button size="sm" variant="primary" onClick={save} disabled={!draft.trim()}>
              Save value
            </Button>
          </> :

        <>
            {status !== 'needsReview' &&
          <span className="mr-auto flex items-center gap-1.5 text-xs font-medium text-success-700">
                <CircleCheckIcon aria-hidden className="h-3.5 w-3.5" />
                {resolvedLabel[status]}
              </span>
          }
           <div className="group relative">  <Button
            size="sm"
            disabled={true}
            onClick={() => {
              setDraft(value);
              setIsEditing(true);
            }}>
            
              Edit value
            </Button><div className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            change values integration coming soon
            <div className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 bg-gray-900"></div>
          </div></div>
            {status === 'needsReview' &&
          <div className="group relative"> <Button size="sm" disabled={true}  onClick={onAccept} className="bg-blue-500 text-white hover:bg-blue-400 min-w-[88px]">
                Accept
              </Button> <div className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity duration-150 group-hover:opacity-100">
            change values integration coming soon
            <div className="absolute -bottom-1 right-3 h-2 w-2 rotate-45 bg-gray-900"></div>
          </div></div>
              
          }
          </>
        }
      </div>
    </div>);

}