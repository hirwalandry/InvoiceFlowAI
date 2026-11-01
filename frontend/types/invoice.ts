export type FieldSection = 'details' | 'lineItems' | 'totals' | 'vendor' | 'remitTo' | 'shipTo' | 'billTo' | 'terms';

export type FieldStatus = 'verified' | 'needsReview' | 'accepted' | 'edited';

export type SyncState = 'idle' | 'syncing' | 'synced';

export interface LineItemMeta {
  qty: number;
  unitPrice: string;
}

export interface ExtractedField {
  id: string;
  section: FieldSection;
  label: string;
  value: string;
  confidence: number;
  sourceLabel: string;
  lineItem?: LineItemMeta;
}

export interface FieldSectionMeta {
  id: FieldSection;
  title: string;
}

export interface RegionHandlers {
  selectedId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
}