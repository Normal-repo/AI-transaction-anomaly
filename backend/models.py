from datetime import datetime, timezone
from typing import Optional
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    """Helper returning current timezone-aware UTC datetime."""
    return datetime.now(timezone.utc)


class Customer(SQLModel, table=True):
    __tablename__ = "customers"

    client_id: str = Field(primary_key=True, index=True)
    name: str = Field(index=True)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    avg_daily_spend: float = Field(default=0.0)
    std_daily_spend: float = Field(default=0.0)
    avg_daily_tx_count: float = Field(default=0.0)
    typical_locations: str = Field(default="[]")  # JSON-serialized list of locations
    trusted_recipients: str = Field(default="[]")  # JSON-serialized list of recipients
    typical_payment_methods: str = Field(default="[]")  # JSON-serialized list
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"

    tx_id: str = Field(primary_key=True, index=True)
    client_id: str = Field(foreign_key="customers.client_id", index=True)
    timestamp: datetime = Field(default_factory=utc_now, index=True)
    recipient: str = Field(index=True)
    location: str = Field(index=True)
    payment_method: str = Field(default="CARD_ONLINE")
    amount: float = Field(default=0.0)
    
    # Derived daily context
    daily_tx_count: int = Field(default=1)
    daily_tx_total: float = Field(default=0.0)
    predicted_daily_spend: Optional[float] = Field(default=None)
    
    # AI and risk signals
    anomaly_score: float = Field(default=0.0)  # 0 to 100
    risk_score: float = Field(default=0.0, index=True)  # 0 to 100
    risk_grade: str = Field(default="NORMAL", index=True)  # NORMAL, LOW, HIGH, CRITICAL
    risk_reasons: str = Field(default="[]")  # JSON-serialized list of reason strings
    is_suspicious: bool = Field(default=False, index=True)
    
    # Ground-truth fraud label for benchmark/offline validation ONLY.
    # NEVER fed into inference, scoring, or alert generation!
    ground_truth_is_fraud: Optional[int] = Field(default=None)


class RiskDetail(SQLModel, table=True):
    __tablename__ = "risk_details"

    tx_id: str = Field(foreign_key="transactions.tx_id", primary_key=True)
    forecast_score: Optional[float] = Field(default=None)
    behaviour_score: float = Field(default=0.0)
    amount_score: float = Field(default=0.0)
    frequency_score: float = Field(default=0.0)
    location_score: float = Field(default=0.0)
    recipient_score: float = Field(default=0.0)
    payment_method_score: float = Field(default=0.0)
    anomaly_score: float = Field(default=0.0)
    final_risk_score: float = Field(default=0.0)
    risk_grade: str = Field(default="NORMAL")
    reason_codes: str = Field(default="[]")  # JSON list
    evaluation_timestamp: datetime = Field(default_factory=utc_now)
    model_version: str = Field(default="v1.0-timesfm-rules")


class InvestigationCase(SQLModel, table=True):
    __tablename__ = "investigation_cases"

    case_id: str = Field(primary_key=True, index=True)
    client_id: str = Field(foreign_key="customers.client_id", index=True)
    tx_id: str = Field(foreign_key="transactions.tx_id", index=True)
    status: str = Field(default="OPEN", index=True)  # OPEN, UNDER_REVIEW, RESOLVED, FALSE_POSITIVE
    severity: str = Field(default="MEDIUM", index=True)  # LOW, MEDIUM, HIGH, CRITICAL
    assigned_to: Optional[str] = Field(default="Lead Analyst")
    resolution_notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)
    resolved_at: Optional[datetime] = Field(default=None)


class CaseNote(SQLModel, table=True):
    __tablename__ = "case_notes"

    note_id: Optional[int] = Field(default=None, primary_key=True)
    case_id: str = Field(foreign_key="investigation_cases.case_id", index=True)
    author_id: str = Field(default="Analyst")
    note_text: str
    created_at: datetime = Field(default_factory=utc_now)


class Notification(SQLModel, table=True):
    __tablename__ = "notifications"

    notification_id: str = Field(primary_key=True, index=True)
    client_id: str = Field(foreign_key="customers.client_id", index=True)
    case_id: Optional[str] = Field(default=None, index=True)
    tx_id: Optional[str] = Field(default=None, index=True)
    channel: str = Field(default="EMAIL")  # EMAIL, SMS, IN_APP
    recipient: str
    message: str
    status: str = Field(default="SIMULATED", index=True)  # PENDING, SENT, DELIVERED, FAILED, SIMULATED
    provider_message_id: Optional[str] = Field(default=None)
    error_message: Optional[str] = Field(default=None)
    attempted_at: datetime = Field(default_factory=utc_now)
    created_at: datetime = Field(default_factory=utc_now)


class AuditRecord(SQLModel, table=True):
    __tablename__ = "audit_records"

    audit_id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: str = Field(index=True)  # CUSTOMER, TRANSACTION, CASE
    entity_id: str = Field(index=True)
    action: str  # UPDATE, CORRECTION, STATUS_CHANGE
    old_value: Optional[str] = Field(default=None)
    new_value: Optional[str] = Field(default=None)
    changed_by: str = Field(default="system")
    changed_at: datetime = Field(default_factory=utc_now)
    reason: Optional[str] = Field(default=None)
