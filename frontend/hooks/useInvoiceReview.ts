"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { invoiceMeta as dummyMeta, REVIEW_THRESHOLD } from "../data/invoice";
import { downloadFields, type ExportFormat } from "../utils/export";
import { isWideLayout, scrollToElement } from "../utils/scroll";
import type { FieldStatus, SyncState } from "../types/invoice";

export function useInvoiceReview(invoiceId?: string | null) {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<any>(null);
  const [fields, setFields] = useState<any[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, FieldStatus>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [loading, setLoading] = useState(false);

  const fetchInvoices = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch("http://localhost:8000/api/invoices", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setInvoices(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  const fetchInvoice = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      const res = await fetch(`http://localhost:8000/api/invoices/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentInvoice(data);
        const extracted = data.extracted_data || {};
        const currency = data.currency || "USD";
        const fmtNumber = (v: number | null | undefined) => {
          if (v == null) return "0";
          return Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        };
        const exFields = extracted.fields || [];
        const lineItemFields = (data.line_items || []).map((li: any, i: number) => ({
          id: `line-${i}`,
          section: "lineItems" as const,
          label: li.description || "",
          value: fmtNumber(li.amount),
          confidence: 90,
          sourceLabel: "Line item",
          lineItem: { qty: li.quantity ?? 0, unitPrice: fmtNumber(li.unit_price) },
        }));
        const mapped = [
          ...exFields.map((f: any) => ({
            id: f.id,
            section: f.section === "supplier" ? "vendor" : f.section === "invoice" ? "details" : f.section === "totals" ? "totals" : f.section === "dates" ? "details" : f.section === "remit" ? "remitTo" : f.section === "ship_to" ? "shipTo" : f.section === "bill_to" ? "billTo" : f.section === "terms" ? "totals" : f.section,
            label: f.label,
            value: f.value || "",
            confidence: f.confidence || 0,
            sourceLabel: f.label,
          })),
          ...lineItemFields,
        ];
        if (mapped.length > 0) {
          setFields(mapped);
          setValues(Object.fromEntries(mapped.map((f: any) => [f.id, f.value])));
          setStatuses(Object.fromEntries(mapped.map((f: any) => [f.id, (f.confidence >= REVIEW_THRESHOLD ? "verified" : "needsReview") as FieldStatus])));
          setSelectedId(mapped[0].id);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (invoiceId) {
      fetchInvoice(invoiceId);
    }
  }, [invoiceId, fetchInvoice]);

  const needsReviewIds = useMemo(
    () => fields.filter((f) => statuses[f.id] === "needsReview").map((f) => f.id),
    [statuses, fields]
  );

  const averageConfidence = useMemo(
    () => (fields.length > 0 ? Math.round(fields.reduce((sum: number, f: any) => sum + (f.confidence || 0), 0) / fields.length) : 0),
    [fields]
  );

  const selectFromList = useCallback((id: string) => {
    setSelectedId((prev) => (prev === id ? null : id));
    if (isWideLayout()) {
      requestAnimationFrame(() => scrollToElement(document.querySelector(`[data-region="${id}"]`)));
    }
  }, []);

  const selectFromDocument = useCallback((id: string) => {
    setSelectedId(id);
    requestAnimationFrame(() => scrollToElement(document.getElementById(`field-${id}`)));
  }, []);

  const advanceFrom = useCallback(
    (id: string) => {
      const next = needsReviewIds.find((x) => x !== id) ?? null;
      setSelectedId(next);
      if (next) requestAnimationFrame(() => scrollToElement(document.getElementById(`field-${next}`)));
    },
    [needsReviewIds]
  );

  const accept = useCallback(
    (id: string) => {
      setStatuses((prev) => ({ ...prev, [id]: "accepted" }));
      advanceFrom(id);
    },
    [advanceFrom]
  );

  const saveEdit = useCallback(
    (id: string, value: string) => {
      setValues((prev) => ({ ...prev, [id]: value }));
      setStatuses((prev) => ({ ...prev, [id]: "edited" }));
      advanceFrom(id);
    },
    [advanceFrom]
  );

  const reviewNext = useCallback(() => {
    const first = needsReviewIds[0];
    if (first) selectFromDocument(first);
  }, [needsReviewIds, selectFromDocument]);

  const approve = useCallback(async () => {
    if (needsReviewIds.length > 0 || syncState !== "idle") return;
    if (!currentInvoice?.id) return;
    setSyncState("syncing");
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
      await fetch(`http://localhost:8000/api/invoices/${currentInvoice.id}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ status: "approved" }),
      });
      setSyncState("synced");
      toast.success("Approved", { description: `Invoice ${currentInvoice.invoice_number || ""} approved.` });
      fetchInvoices();
    } catch (e) {
      setSyncState("idle");
      toast.error("Failed to approve");
    }
  }, [needsReviewIds.length, syncState, currentInvoice, fetchInvoices]);

  const exportAs = useCallback(
    (format: ExportFormat) => {
      downloadFields(fields, values, statuses, currentInvoice?.invoice_number || dummyMeta.number, format);
      toast.success(format === "csv" ? "CSV exported" : "Excel file exported");
    },
    [fields, values, statuses, currentInvoice]
  );

  return {
    invoices,
    currentInvoice,
    fields,
    values,
    statuses,
    selectedId,
    hoveredId,
    setHoveredId,
    syncState,
    needsReviewCount: needsReviewIds.length,
    averageConfidence,
    loading,
    fetchInvoices,
    fetchInvoice,
    selectFromList,
    selectFromDocument,
    accept,
    saveEdit,
    reviewNext,
    approve,
    exportAs,
  };
}
