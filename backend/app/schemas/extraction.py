from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from datetime import date

class BoundingBox(BaseModel):
    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0
    page: int = 1

class ExtractedFieldDetail(BaseModel):
    id: str
    label: str
    section: str
    value: Optional[str] = None
    confidence: float = Field(default=0.0, ge=0.0, le=100.0)
    status: str = "needsReview"  # verified, accepted, edited, needsReview
    notes: Optional[str] = None
    bbox: Optional[BoundingBox] = None

class LineItemExtracted(BaseModel):
    id: Optional[str] = None
    description: Optional[str] = Field(None, description="Item description or service name")
    quantity: Optional[Decimal] = Field(None, description="Quantity of units")
    unit_price: Optional[Decimal] = Field(None, description="Unit price per item")
    amount: Optional[Decimal] = Field(None, description="Total amount for this line item")
    confidence: float = 90.0

class InvoiceExtractionSchema(BaseModel):
    vendor_name: Optional[str] = Field(None, description="Supplier, vendor, or business name issuing the invoice")
    vendor_address: Optional[str] = Field(None, description="Full address of the supplier")
    vendor_email: Optional[str] = Field(None, description="Contact email of the supplier")
    invoice_number: Optional[str] = Field(None, description="Invoice or reference number")
    invoice_date: Optional[str] = Field(None, description="Date invoice was issued (YYYY-MM-DD or raw string)")
    due_date: Optional[str] = Field(None, description="Payment due date (YYYY-MM-DD or raw string)")
    currency: str = Field("USD", description="Currency ISO code or symbol ($/EUR/USD)")
    subtotal: Optional[Decimal] = Field(None, description="Subtotal amount before tax")
    tax_amount: Optional[Decimal] = Field(None, description="Tax, VAT, GST, or sales tax amount")
    total_due: Optional[Decimal] = Field(None, description="Grand total amount payable")
    remit_name: Optional[str] = Field(None, description="Remit-to payable name")
    remit_address: Optional[str] = Field(None, description="Remit-to payment address")
    ship_to_name: Optional[str] = Field(None, description="Ship-to recipient name")
    ship_to_address: Optional[str] = Field(None, description="Ship-to delivery address")
    bill_to_name: Optional[str] = Field(None, description="Bill-to customer name")
    bill_to_address: Optional[str] = Field(None, description="Bill-to customer address")
    send_payment_name: Optional[str] = Field(None, description="Send payment to name")
    send_payment_address: Optional[str] = Field(None, description="Send payment to address")
    terms_and_conditions: Optional[str] = Field(None, description="Terms and conditions text")
    line_items: List[LineItemExtracted] = Field(default_factory=list)

class ValidationResult(BaseModel):
    rule_name: str
    passed: bool
    message: str
    severity: str = "warning"  # warning, error

class FullInvoiceExtractionResult(BaseModel):
    invoice_id: str
    fields: List[ExtractedFieldDetail]
    line_items: List[LineItemExtracted]
    validations: List[ValidationResult]
    average_confidence: float
    needs_review_count: int
