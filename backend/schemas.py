from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    reason: str = Field(..., description="Audit reason for customer profile modification")
    changed_by: str = Field(default="Analyst", description="Identifier of the analyst or admin making the edit")


class TransactionCreate(BaseModel):
    client_id: str
    recipient: str
    location: str
    payment_method: str = "CARD_ONLINE"
    amount: float
    timestamp: Optional[datetime] = None
    # Optional offline evaluation label only; never used in live scoring
    ground_truth_is_fraud: Optional[int] = None


class TransactionCorrection(BaseModel):
    reason: str
    changed_by: str = "Analyst"
    corrected_amount: Optional[float] = None
    corrected_recipient: Optional[str] = None
    corrected_location: Optional[str] = None


class CaseCreate(BaseModel):
    client_id: str
    tx_id: str
    severity: str = "MEDIUM"
    assigned_to: Optional[str] = "Lead Analyst"
    initial_note: Optional[str] = None


class CaseUpdate(BaseModel):
    status: Optional[str] = None
    severity: Optional[str] = None
    assigned_to: Optional[str] = None
    resolution_notes: Optional[str] = None
    changed_by: str = "Analyst"


class CaseNoteCreate(BaseModel):
    note_text: str
    author_id: str = "Analyst"


class NotificationSendRequest(BaseModel):
    client_id: str
    tx_id: Optional[str] = None
    case_id: Optional[str] = None
    channel: str = "EMAIL"  # EMAIL, SMS, IN_APP
    recipient: str
    message: str


class RiskSignalItem(BaseModel):
    name: str
    score: float
    weight: float
    description: str


class RiskReportResponse(BaseModel):
    tx_id: str
    client_id: str
    timestamp: datetime
    amount: float
    risk_score: float
    risk_grade: str
    is_suspicious: bool
    reasons: List[str]
    signals: List[RiskSignalItem]
    component_scores: Dict[str, Any]
    baseline_comparison: Dict[str, Any]
    forecast_context: Dict[str, Any]
    disclaimer: str = (
        "This is an automated risk assessment designed for human analyst review. "
        "A high risk score indicates unusual behavior, NOT confirmed fraud."
    )


class DashboardWarning(BaseModel):
    tx_id: str
    client_id: str
    client_name: str
    timestamp: datetime
    amount: float
    risk_score: float
    risk_grade: str
    reasons: List[str]
    case_id: Optional[str] = None
    case_status: Optional[str] = None


class DashboardSummary(BaseModel):
    total_customers: int
    transactions_processed: int
    suspicious_transactions: int
    high_critical_alerts: int
    open_investigations: int
    recent_warnings: List[DashboardWarning]

