"use client";

import React, { useState } from "react";
import { AppSidebar } from "../../components/AppSidebar";
import { ReviewHeader } from "../../components/ReviewHeader";
import { DocumentViewer } from "../../components/DocumentViewer";
import { ExtractedFieldsPanel } from "../../components/ExtractedFieldsPanel";
import { ActionBar } from "../../components/ActionBar";
import { useInvoiceReview } from "../../hooks/useInvoiceReview";
import type { RegionHandlers } from "../../types/invoice";

export default function DashboardPage() {
  const review = useInvoiceReview();
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const regions: RegionHandlers = {
    selectedId: review.selectedId,
    hoveredId: review.hoveredId,
    onHover: review.setHoveredId,
    onSelect: review.selectFromDocument,
  };

  const handleSelectInvoice = async (id: string) => {
    setSelectedInvoiceId(id);
    await review.fetchInvoice(id);
  };

  const showList = !selectedInvoiceId && !review.currentInvoice;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-canvas font-sans text-ink-900">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <ReviewHeader needsReviewCount={review.needsReviewCount} syncState={review.syncState} invoice={review.currentInvoice} />
        <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          {showList ? (
            <div className="mx-auto max-w-[1100px]">
              <div className="mb-4">
                <h1 className="text-xl font-semibold text-ink-900">All Invoices</h1>
                <p className="text-sm text-ink-500">Select an invoice to review extracted fields</p>
              </div>
              <div className="rounded-lg border border-line bg-white overflow-hidden">
                <div className="grid grid-cols-6 gap-4 px-4 py-2 text-xs font-medium text-ink-500 border-b border-line">
                  <div>Invoice #</div>
                  <div>Vendor</div>
                  <div>Filename</div>
                  <div>Status</div>
                  <div>Amount</div>
                  <div>Date</div>
                </div>
                {review.invoices.length === 0 && (
                  <div className="px-4 py-6 text-sm text-ink-500">No invoices found</div>
                )}
                {review.invoices.map((inv: any) => (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv.id)}
                    className="w-full grid grid-cols-6 gap-4 px-4 py-3 text-left text-sm hover:bg-canvas border-b border-line last:border-b-0"
                  >
                    <div className="text-ink-900 font-medium">{inv.invoice_number || "-"}</div>
                    <div className="text-ink-700 truncate">{inv.vendor_name || "-"}</div>
                    <div className="text-ink-500 truncate">{inv.filename}</div>
                    <div className="text-ink-700 capitalize">{inv.status}</div>
                    <div className="text-ink-900">{inv.total_amount ? `$${inv.total_amount}` : "-"}</div>
                    <div className="text-ink-500">{inv.invoice_date || "-"}</div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto grid max-w-[1440px] gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] xl:items-start">
              <DocumentViewer regions={regions} invoiceId={selectedInvoiceId || review.currentInvoice?.id} />
              <ExtractedFieldsPanel
                fields={review.fields}
                values={review.values}
                statuses={review.statuses}
                selectedId={review.selectedId}
                hoveredId={review.hoveredId}
                averageConfidence={review.averageConfidence}
                needsReviewCount={review.needsReviewCount}
                onSelect={review.selectFromList}
                onHover={review.setHoveredId}
                onAccept={review.accept}
                onSave={review.saveEdit}
                onReviewNext={review.reviewNext}
              />
            </div>
          )}
        </main>
        {!showList && (
          <ActionBar
            needsReviewCount={review.needsReviewCount}
            syncState={review.syncState}
            onApprove={review.approve}
            onExport={review.exportAs}
          />
        )}
      </div>
    </div>
  );
}