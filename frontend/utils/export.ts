import type { ExtractedField, FieldStatus } from '../types/invoice';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

const statusLabel: Record<FieldStatus, string> = {
  verified: 'Verified',
  accepted: 'Accepted',
  edited: 'Edited',
  needsReview: 'Needs review'
};

export function downloadFields(
  fields: ExtractedField[],
  values: Record<string, string>,
  statuses: Record<string, FieldStatus>,
  baseName: string,
  format: ExportFormat)
{
  if (format === 'pdf') {
    const content = [
      'INVOICE EXTRACTION REPORT',
      '='.repeat(50),
      '',
      `Invoice: ${baseName}`,
      `Generated: ${new Date().toLocaleString()}`,
      '',
      '-'.repeat(50),
      '',
      ...fields.map((f, idx) => 
        [
          `${idx + 1}. ${f.section} - ${f.label}`,
          `   Value: ${values[f.id] || 'N/A'}`,
          `   Confidence: ${f.confidence}%`,
          `   Status: ${statusLabel[statuses[f.id]]}`,
          ''
        ].join('\n')
      )
    ].join('\n');
    
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }

  const sep = format === 'csv' ? ',' : '\t';
  const escape = (v: string) => {
    const flat = v.replace(/\n/g, ', ');
    return format === 'csv' ? `"${flat.replace(/"/g, '""')}"` : flat;
  };
  const header = ['Section', 'Field', 'Value', 'Confidence', 'Status'].join(sep);
  const rows = fields.map((f) =>
  [f.section, f.label, values[f.id], `${f.confidence}%`, statusLabel[statuses[f.id]]].
  map((v) => escape(String(v))).
  join(sep)
  );
  const blob = new Blob([[header, ...rows].join('\n')], {
    type: format === 'csv' ? 'text/csv' : 'application/vnd.ms-excel'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${baseName}.${format === 'csv' ? 'csv' : 'xls'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}