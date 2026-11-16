"""FastAPI Router implementing the Banking Monitoring API (v1).

Adheres strictly to the specification:
- Prefix /api/v1
- Short, readable route handlers
- Type hints on parameters and returns
- SQLModel queries and dependency injection
- Zero ground_truth_is_fraud usage in inference
"""

from datetime import datetime, timedelta, timezone
import json
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import Session, select, func, desc

from .database import get_session
from .models import (
    Customer,
    Transaction,
    RiskDetail,
    InvestigationCase,
    CaseNote,
    Notification,
    AuditRecord,
    utc_now
)
from .schemas import (
    CustomerUpdate,
    TransactionCreate,
    TransactionCorrection,
    CaseCreate,
    CaseUpdate,
    CaseNoteCreate,
    NotificationSendRequest,
    RiskReportResponse,
    RiskSignalItem,
    DashboardSummary,
    DashboardWarning
)
from .ai_engine import (
    evaluate_transaction_risk,
    compute_customer_baseline,
    forecast_daily_spending
)
from .operations import (
    update_customer_profile,
    correct_transaction,
    create_investigation_case,
    update_investigation_case,
    add_case_note,
    send_notification,
    retry_notification,
    log_audit_entry
)

router = APIRouter(prefix="/api/v1")


# ==========================================
# 1. DASHBOARD
# ==========================================

@router.get("/dashboard/summary", response_model=DashboardSummary)
def get_dashboard_summary(session: Session = Depends(get_session)) -> DashboardSummary:
    """Returns high-level summary KPIs and actionable suspicious-transaction warnings."""
    total_customers = session.exec(select(func.count(Customer.client_id))).one()
    tx_count = session.exec(select(func.count(Transaction.tx_id))).one()
    suspicious_count = session.exec(
        select(func.count(Transaction.tx_id)).where(Transaction.is_suspicious == True)
    ).one()
    high_critical = session.exec(
        select(func.count(Transaction.tx_id)).where(Transaction.risk_grade.in_(["HIGH", "CRITICAL"]))
    ).one()
    open_cases = session.exec(
        select(func.count(InvestigationCase.case_id)).where(
            InvestigationCase.status.in_(["OPEN", "UNDER_REVIEW"])
        )
    ).one()

    # Fetch recent suspicious warnings (ordered by timestamp desc)
    flagged_txs = session.exec(
        select(Transaction)
        .where(Transaction.is_suspicious == True)
        .order_by(desc(Transaction.timestamp))
        .limit(10)
    ).all()

    warnings: List[DashboardWarning] = []
    for tx in flagged_txs:
        cust = session.get(Customer, tx.client_id)
        cust_name = cust.name if cust else "Unknown"

        # Check for associated case
        case = session.exec(
            select(InvestigationCase).where(InvestigationCase.tx_id == tx.tx_id)
        ).first()

        try:
            reasons_list = json.loads(tx.risk_reasons)
        except Exception:
            reasons_list = [tx.risk_reasons] if tx.risk_reasons else []

        warnings.append(
            DashboardWarning(
                tx_id=tx.tx_id,
                client_id=tx.client_id,
                client_name=cust_name,
                timestamp=tx.timestamp,
                amount=tx.amount,
                risk_score=tx.risk_score,
                risk_grade=tx.risk_grade,
                reasons=reasons_list,
                case_id=case.case_id if case else None,
                case_status=case.status if case else None
            )
        )

    return DashboardSummary(
        total_customers=total_customers,
        transactions_processed=tx_count,
        suspicious_transactions=suspicious_count,
        high_critical_alerts=high_critical,
        open_investigations=open_cases,
        recent_warnings=warnings
    )


# ==========================================
# 2. CUSTOMERS
# ==========================================

@router.get("/clients")
def list_clients(
    search: Optional[str] = None,
    limit: int = Query(default=50, le=100),
    offset: int = 0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Retrieve customer directory with risk status summary."""
    query = select(Customer)
    if search:
        query = query.where(
            Customer.name.contains(search) | Customer.client_id.contains(search)
        )
    total = session.exec(select(func.count(Customer.client_id))).one()
    customers = session.exec(query.offset(offset).limit(limit)).all()

    items = []
    for c in customers:
        # Calculate recent suspicious count for this customer
        susp_count = session.exec(
            select(func.count(Transaction.tx_id))
            .where(Transaction.client_id == c.client_id)
            .where(Transaction.is_suspicious == True)
        ).one()

        has_active_case = session.exec(
            select(func.count(InvestigationCase.case_id))
            .where(InvestigationCase.client_id == c.client_id)
            .where(InvestigationCase.status.in_(["OPEN", "UNDER_REVIEW"]))
        ).one() > 0

        items.append({
            "client_id": c.client_id,
            "name": c.name,
            "email": c.email,
            "phone": c.phone,
            "avg_daily_spend": c.avg_daily_spend,
            "std_daily_spend": c.std_daily_spend,
            "avg_daily_tx_count": c.avg_daily_tx_count,
            "suspicious_tx_count": susp_count,
            "has_active_warning": (susp_count > 0 or has_active_case),
            "typical_locations": json.loads(c.typical_locations or "[]"),
            "trusted_recipients": json.loads(c.trusted_recipients or "[]"),
            "typical_payment_methods": json.loads(c.typical_payment_methods or "[]"),
            "created_at": c.created_at,
            "updated_at": c.updated_at
        })

    return {"total": total, "items": items, "limit": limit, "offset": offset}


@router.get("/clients/{client_id}")
def get_client_details(client_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get complete customer profile and behavioral baseline."""
    customer = session.get(Customer, client_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{client_id}' not found.")

    # Historical stats
    tx_count = session.exec(
        select(func.count(Transaction.tx_id)).where(Transaction.client_id == client_id)
    ).one()
    susp_count = session.exec(
        select(func.count(Transaction.tx_id))
        .where(Transaction.client_id == client_id)
        .where(Transaction.is_suspicious == True)
    ).one()

    return {
        "client_id": customer.client_id,
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone,
        "avg_daily_spend": customer.avg_daily_spend,
        "std_daily_spend": customer.std_daily_spend,
        "avg_daily_tx_count": customer.avg_daily_tx_count,
        "typical_locations": json.loads(customer.typical_locations or "[]"),
        "trusted_recipients": json.loads(customer.trusted_recipients or "[]"),
        "typical_payment_methods": json.loads(customer.typical_payment_methods or "[]"),
        "total_transactions": tx_count,
        "suspicious_transactions": susp_count,
        "created_at": customer.created_at,
        "updated_at": customer.updated_at
    }


@router.patch("/clients/{client_id}")
def update_client(
    client_id: str,
    payload: CustomerUpdate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Validated update of customer profile fields with automatic audit trail."""
    try:
        updated = update_customer_profile(
            session=session,
            client_id=client_id,
            name=payload.name,
            email=payload.email,
            phone=payload.phone,
            reason=payload.reason,
            changed_by=payload.changed_by
        )
        return {
            "message": "Customer profile updated successfully.",
            "client_id": updated.client_id,
            "name": updated.name,
            "email": updated.email,
            "phone": updated.phone,
            "updated_at": updated.updated_at
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/clients/{client_id}/transactions")
def get_client_transactions(
    client_id: str,
    grade: Optional[str] = None,
    suspicious_only: bool = False,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Fetch transactions for a specific customer."""
    customer = session.get(Customer, client_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{client_id}' not found.")

    query = select(Transaction).where(Transaction.client_id == client_id)
    if grade:
        query = query.where(Transaction.risk_grade == grade.upper())
    if suspicious_only:
        query = query.where(Transaction.is_suspicious == True)

    total = session.exec(select(func.count(Transaction.tx_id)).where(Transaction.client_id == client_id)).one()
    txs = session.exec(query.order_by(desc(Transaction.timestamp)).offset(offset).limit(limit)).all()

    results = []
    for tx in txs:
        results.append({
            "tx_id": tx.tx_id,
            "client_id": tx.client_id,
            "timestamp": tx.timestamp,
            "recipient": tx.recipient,
            "location": tx.location,
            "payment_method": tx.payment_method,
            "amount": tx.amount,
            "daily_tx_count": tx.daily_tx_count,
            "daily_tx_total": tx.daily_tx_total,
            "predicted_daily_spend": tx.predicted_daily_spend,
            "risk_score": tx.risk_score,
            "risk_grade": tx.risk_grade,
            "is_suspicious": tx.is_suspicious,
            "reasons": json.loads(tx.risk_reasons or "[]")
        })

    return {"total": total, "items": results, "limit": limit, "offset": offset}


@router.get("/clients/{client_id}/analytics")
def get_client_analytics(client_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get customer spending history and 7-day TimesFM / EMA spending forecast."""
    customer = session.get(Customer, client_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{client_id}' not found.")

    # Aggregate daily spending from the last 30 days
    txs = session.exec(
        select(Transaction)
        .where(Transaction.client_id == client_id)
        .order_by(Transaction.timestamp)
    ).all()

    daily_spend_map: Dict[str, float] = {}
    daily_count_map: Dict[str, int] = {}
    for tx in txs:
        day_str = tx.timestamp.strftime("%Y-%m-%d")
        daily_spend_map[day_str] = round(daily_spend_map.get(day_str, 0.0) + tx.amount, 2)
        daily_count_map[day_str] = daily_count_map.get(day_str, 0) + 1

    history = [
        {"date": day, "spend": daily_spend_map[day], "count": daily_count_map[day]}
        for day in sorted(daily_spend_map.keys())
    ]

    # Calculate 7-day forecast
    spend_values = [h["spend"] for h in history]
    forecast_result = forecast_daily_spending(spend_values, horizon=7)

    # Format 7-day forecast dates
    last_date = datetime.strptime(history[-1]["date"], "%Y-%m-%d") if history else datetime.utcnow()
    forecast_series = []
    for i, val in enumerate(forecast_result["forecast"]):
        fc_date = (last_date + timedelta(days=i + 1)).strftime("%Y-%m-%d")
        forecast_series.append({"date": fc_date, "predicted_spend": val})

    return {
        "client_id": client_id,
        "history": history,
        "forecast": forecast_series,
        "forecast_meta": {
            "model_name": forecast_result["model_name"],
            "fallback_used": forecast_result["fallback_used"],
            "mean_forecast": forecast_result.get("mean_forecast", 0.0),
            "horizon_days": 7
        }
    }


# ==========================================
# 3. TRANSACTIONS & RISK REPORTS
# ==========================================

@router.get("/transactions")
def list_transactions(
    client_id: Optional[str] = None,
    grade: Optional[str] = None,
    suspicious_only: bool = False,
    search: Optional[str] = None,
    limit: int = Query(default=50, le=200),
    offset: int = 0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Search and browse transactions with multi-field filtering."""
    query = select(Transaction)
    if client_id:
        query = query.where(Transaction.client_id == client_id)
    if grade:
        query = query.where(Transaction.risk_grade == grade.upper())
    if suspicious_only:
        query = query.where(Transaction.is_suspicious == True)
    if search:
        query = query.where(
            Transaction.tx_id.contains(search) |
            Transaction.recipient.contains(search) |
            Transaction.location.contains(search)
        )

    # Count total matching
    count_query = select(func.count(Transaction.tx_id))
    if client_id:
        count_query = count_query.where(Transaction.client_id == client_id)
    if grade:
        count_query = count_query.where(Transaction.risk_grade == grade.upper())
    if suspicious_only:
        count_query = count_query.where(Transaction.is_suspicious == True)

    total = session.exec(count_query).one()
    txs = session.exec(query.order_by(desc(Transaction.timestamp)).offset(offset).limit(limit)).all()

    items = []
    for tx in txs:
        cust = session.get(Customer, tx.client_id)
        items.append({
            "tx_id": tx.tx_id,
            "client_id": tx.client_id,
            "client_name": cust.name if cust else "Unknown",
            "timestamp": tx.timestamp,
            "recipient": tx.recipient,
            "location": tx.location,
            "payment_method": tx.payment_method,
            "amount": tx.amount,
            "daily_tx_count": tx.daily_tx_count,
            "daily_tx_total": tx.daily_tx_total,
            "predicted_daily_spend": tx.predicted_daily_spend,
            "anomaly_score": tx.anomaly_score,
            "risk_score": tx.risk_score,
            "risk_grade": tx.risk_grade,
            "is_suspicious": tx.is_suspicious,
            "reasons": json.loads(tx.risk_reasons or "[]")
        })

    return {"total": total, "items": items, "limit": limit, "offset": offset}


@router.get("/transactions/{tx_id}")
def get_transaction(tx_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Retrieve single transaction with customer name and context."""
    tx = session.get(Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction '{tx_id}' not found.")

    cust = session.get(Customer, tx.client_id)
    case = session.exec(select(InvestigationCase).where(InvestigationCase.tx_id == tx_id)).first()

    return {
        "tx_id": tx.tx_id,
        "client_id": tx.client_id,
        "client_name": cust.name if cust else "Unknown",
        "timestamp": tx.timestamp,
        "recipient": tx.recipient,
        "location": tx.location,
        "payment_method": tx.payment_method,
        "amount": tx.amount,
        "daily_tx_count": tx.daily_tx_count,
        "daily_tx_total": tx.daily_tx_total,
        "predicted_daily_spend": tx.predicted_daily_spend,
        "anomaly_score": tx.anomaly_score,
        "risk_score": tx.risk_score,
        "risk_grade": tx.risk_grade,
        "is_suspicious": tx.is_suspicious,
        "reasons": json.loads(tx.risk_reasons or "[]"),
        "case_id": case.case_id if case else None,
        "case_status": case.status if case else None
    }


@router.get("/transactions/{tx_id}/risk-report", response_model=RiskReportResponse)
def get_transaction_risk_report(tx_id: str, session: Session = Depends(get_session)) -> RiskReportResponse:
    """Detailed explainable risk report with baseline comparison and component breakdowns."""
    tx = session.get(Transaction, tx_id)
    if not tx:
        raise HTTPException(status_code=404, detail=f"Transaction '{tx_id}' not found.")

    customer = session.get(Customer, tx.client_id)
    risk_det = session.get(RiskDetail, tx_id)

    # Reconstruct or fetch baseline context
    baseline_ctx = {
        "avg_daily_spend": customer.avg_daily_spend if customer else 0.0,
        "std_daily_spend": customer.std_daily_spend if customer else 0.0,
        "avg_daily_tx_count": customer.avg_daily_tx_count if customer else 0.0,
        "typical_locations": json.loads(customer.typical_locations or "[]") if customer else [],
        "trusted_recipients": json.loads(customer.trusted_recipients or "[]") if customer else [],
        "typical_payment_methods": json.loads(customer.typical_payment_methods or "[]") if customer else []
    }

    forecast_ctx = {
        "predicted_daily_spend": tx.predicted_daily_spend,
        "actual_daily_total": tx.daily_tx_total,
        "deviation": round(tx.daily_tx_total - (tx.predicted_daily_spend or 0.0), 2)
    }

    # Signal items
    signals = [
        RiskSignalItem(
            name="Amount Deviation",
            score=risk_det.amount_score if risk_det else 0.0,
            weight=0.35,
            description=f"Transaction amount (₹{tx.amount:,.2f}) vs customer average daily spend (₹{baseline_ctx['avg_daily_spend']:,.2f})."
        ),
        RiskSignalItem(
            name="Velocity & Frequency",
            score=risk_det.frequency_score if risk_det else 0.0,
            weight=0.25,
            description=f"Daily count of {tx.daily_tx_count} and daily sum of ₹{tx.daily_tx_total:,.2f}."
        ),
        RiskSignalItem(
            name="Location Familiarity",
            score=risk_det.location_score if risk_det else 0.0,
            weight=0.15,
            description=f"Origin location '{tx.location}' verified against typical locations."
        ),
        RiskSignalItem(
            name="Recipient Trust",
            score=risk_det.recipient_score if risk_det else 0.0,
            weight=0.15,
            description=f"Recipient '{tx.recipient}' verified against trusted counterparty records."
        ),
        RiskSignalItem(
            name="Payment Method & Off-Hours",
            score=risk_det.payment_method_score if risk_det else 0.0,
            weight=0.10,
            description=f"Payment instrument '{tx.payment_method}' at {tx.timestamp.strftime('%H:%M UTC')}."
        )
    ]

    component_scores = {
        "amount_score": risk_det.amount_score if risk_det else 0.0,
        "frequency_score": risk_det.frequency_score if risk_det else 0.0,
        "location_score": risk_det.location_score if risk_det else 0.0,
        "recipient_score": risk_det.recipient_score if risk_det else 0.0,
        "payment_method_score": risk_det.payment_method_score if risk_det else 0.0,
        "anomaly_score": tx.anomaly_score,
        "final_risk_score": tx.risk_score
    }

    try:
        reasons_list = json.loads(tx.risk_reasons)
    except Exception:
        reasons_list = [tx.risk_reasons] if tx.risk_reasons else []

    return RiskReportResponse(
        tx_id=tx.tx_id,
        client_id=tx.client_id,
        timestamp=tx.timestamp,
        amount=tx.amount,
        risk_score=tx.risk_score,
        risk_grade=tx.risk_grade,
        is_suspicious=tx.is_suspicious,
        reasons=reasons_list,
        signals=signals,
        component_scores=component_scores,
        baseline_comparison=baseline_ctx,
        forecast_context=forecast_ctx
    )


@router.post("/transactions", status_code=status.HTTP_201_CREATED)
def ingest_transaction(
    payload: TransactionCreate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Ingest, evaluate, and persist a financial transaction.

    Calculates risk score and explanation. Ground-truth labels are never passed to AI.
    """
    customer = session.get(Customer, payload.client_id)
    if not customer:
        raise HTTPException(status_code=404, detail=f"Customer '{payload.client_id}' does not exist.")

    tx_time = payload.timestamp or utc_now()
    tx_id = f"TXN-{int(datetime.utcnow().timestamp() * 1000) % 1000000}"

    # Calculate today's existing transaction velocity for this customer
    start_of_day = tx_time.replace(hour=0, minute=0, second=0, microsecond=0)
    todays_txs = session.exec(
        select(Transaction)
        .where(Transaction.client_id == payload.client_id)
        .where(Transaction.timestamp >= start_of_day)
    ).all()

    daily_count = len(todays_txs) + 1
    daily_total = sum(t.amount for t in todays_txs) + payload.amount

    baseline_dict = {
        "avg_daily_spend": customer.avg_daily_spend,
        "std_daily_spend": customer.std_daily_spend,
        "avg_tx_amount": customer.avg_daily_spend / max(1.0, customer.avg_daily_tx_count),
        "avg_daily_tx_count": customer.avg_daily_tx_count,
        "typical_locations": json.loads(customer.typical_locations or "[]"),
        "trusted_recipients": json.loads(customer.trusted_recipients or "[]"),
        "typical_payment_methods": json.loads(customer.typical_payment_methods or "[]"),
        "has_sufficient_history": True
    }

    # Evaluate risk score without ground_truth_is_fraud
    eval_result = evaluate_transaction_risk(
        amount=payload.amount,
        recipient=payload.recipient,
        location=payload.location,
        payment_method=payload.payment_method,
        hour=tx_time.hour,
        daily_tx_count=daily_count,
        daily_tx_total=daily_total,
        customer_baseline=baseline_dict
    )

    new_tx = Transaction(
        tx_id=tx_id,
        client_id=payload.client_id,
        timestamp=tx_time,
        recipient=payload.recipient,
        location=payload.location,
        payment_method=payload.payment_method,
        amount=payload.amount,
        daily_tx_count=daily_count,
        daily_tx_total=round(daily_total, 2),
        predicted_daily_spend=round(customer.avg_daily_spend, 2),
        anomaly_score=eval_result["anomaly_score"],
        risk_score=eval_result["risk_score"],
        risk_grade=eval_result["risk_grade"],
        risk_reasons=json.dumps(eval_result["reasons"]),
        is_suspicious=eval_result["is_suspicious"],
        ground_truth_is_fraud=payload.ground_truth_is_fraud
    )
    session.add(new_tx)
    session.commit()
    session.refresh(new_tx)

    # Persist risk detail
    risk_det = RiskDetail(
        tx_id=tx_id,
        forecast_score=eval_result["component_scores"].get("forecast_score", 0.0),
        behaviour_score=eval_result["component_scores"].get("amount_score", 0.0),
        amount_score=eval_result["component_scores"].get("amount_score", 0.0),
        frequency_score=eval_result["component_scores"].get("velocity_score", 0.0),
        location_score=eval_result["component_scores"].get("location_score", 0.0),
        recipient_score=eval_result["component_scores"].get("recipient_score", 0.0),
        payment_method_score=eval_result["component_scores"].get("method_score", 0.0),
        anomaly_score=eval_result["anomaly_score"],
        final_risk_score=eval_result["risk_score"],
        risk_grade=eval_result["risk_grade"],
        reason_codes=json.dumps(eval_result["reasons"]),
        evaluation_timestamp=tx_time
    )
    session.add(risk_det)
    session.commit()

    # Automatically open case if CRITICAL or HIGH risk
    case_id = None
    if eval_result["is_suspicious"]:
        sev = "CRITICAL" if eval_result["risk_grade"] == "CRITICAL" else "HIGH"
        case = create_investigation_case(
            session=session,
            client_id=payload.client_id,
            tx_id=tx_id,
            severity=sev,
            initial_note=f"Automated warning opened for risk score {eval_result['risk_score']} ({eval_result['risk_grade']})."
        )
        case_id = case.case_id

    return {
        "tx_id": new_tx.tx_id,
        "client_id": new_tx.client_id,
        "amount": new_tx.amount,
        "risk_score": new_tx.risk_score,
        "risk_grade": new_tx.risk_grade,
        "is_suspicious": new_tx.is_suspicious,
        "reasons": eval_result["reasons"],
        "case_id": case_id
    }


@router.post("/transactions/{tx_id}/corrections")
def correct_transaction_endpoint(
    tx_id: str,
    payload: TransactionCorrection,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Audited transaction correction preserving original historical record."""
    try:
        updated_tx = correct_transaction(
            session=session,
            tx_id=tx_id,
            reason=payload.reason,
            changed_by=payload.changed_by,
            corrected_amount=payload.corrected_amount,
            corrected_recipient=payload.corrected_recipient,
            corrected_location=payload.corrected_location
        )
        return {
            "message": "Transaction corrected and audited successfully.",
            "tx_id": updated_tx.tx_id,
            "amount": updated_tx.amount,
            "recipient": updated_tx.recipient,
            "location": updated_tx.location
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==========================================
# 4. INVESTIGATIONS
# ==========================================

@router.get("/cases")
def list_cases(
    status_filter: Optional[str] = None,
    severity: Optional[str] = None,
    client_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Retrieve investigation cases with associated customer and transaction data."""
    query = select(InvestigationCase)
    if status_filter:
        query = query.where(InvestigationCase.status == status_filter.upper())
    if severity:
        query = query.where(InvestigationCase.severity == severity.upper())
    if client_id:
        query = query.where(InvestigationCase.client_id == client_id)

    total = session.exec(select(func.count(InvestigationCase.case_id))).one()
    cases = session.exec(query.order_by(desc(InvestigationCase.created_at)).offset(offset).limit(limit)).all()

    items = []
    for c in cases:
        cust = session.get(Customer, c.client_id)
        tx = session.get(Transaction, c.tx_id)
        items.append({
            "case_id": c.case_id,
            "client_id": c.client_id,
            "client_name": cust.name if cust else "Unknown",
            "tx_id": c.tx_id,
            "amount": tx.amount if tx else 0.0,
            "risk_score": tx.risk_score if tx else 0.0,
            "risk_grade": tx.risk_grade if tx else "UNKNOWN",
            "status": c.status,
            "severity": c.severity,
            "assigned_to": c.assigned_to,
            "resolution_notes": c.resolution_notes,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "resolved_at": c.resolved_at
        })

    return {"total": total, "items": items, "limit": limit, "offset": offset}


@router.get("/cases/{case_id}")
def get_case_details(case_id: str, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Get complete case context, linked marked transaction, notes, and audit history."""
    case = session.get(InvestigationCase, case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Case '{case_id}' not found.")

    cust = session.get(Customer, case.client_id)
    tx = session.get(Transaction, case.tx_id)
    notes = session.exec(
        select(CaseNote).where(CaseNote.case_id == case_id).order_by(CaseNote.created_at)
    ).all()
    audits = session.exec(
        select(AuditRecord).where(AuditRecord.entity_id == case_id).order_by(AuditRecord.changed_at)
    ).all()

    reasons_list = []
    if tx:
        try:
            reasons_list = json.loads(tx.risk_reasons)
        except Exception:
            reasons_list = [tx.risk_reasons] if tx.risk_reasons else []

    return {
        "case_id": case.case_id,
        "client_id": case.client_id,
        "client_name": cust.name if cust else "Unknown",
        "client_email": cust.email if cust else None,
        "client_phone": cust.phone if cust else None,
        "status": case.status,
        "severity": case.severity,
        "assigned_to": case.assigned_to,
        "resolution_notes": case.resolution_notes,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
        "resolved_at": case.resolved_at,
        "transaction": {
            "tx_id": tx.tx_id if tx else None,
            "timestamp": tx.timestamp if tx else None,
            "amount": tx.amount if tx else 0.0,
            "recipient": tx.recipient if tx else "",
            "location": tx.location if tx else "",
            "payment_method": tx.payment_method if tx else "",
            "risk_score": tx.risk_score if tx else 0.0,
            "risk_grade": tx.risk_grade if tx else "NORMAL",
            "reasons": reasons_list
        } if tx else None,
        "notes": [
            {
                "note_id": n.note_id,
                "author_id": n.author_id,
                "note_text": n.note_text,
                "created_at": n.created_at
            }
            for n in notes
        ],
        "audit_trail": [
            {
                "audit_id": a.audit_id,
                "action": a.action,
                "changed_by": a.changed_by,
                "changed_at": a.changed_at,
                "reason": a.reason
            }
            for a in audits
        ]
    }


@router.post("/cases", status_code=status.HTTP_201_CREATED)
def create_case_endpoint(payload: CaseCreate, session: Session = Depends(get_session)) -> Dict[str, Any]:
    """Manually open an investigation case for a transaction."""
    case = create_investigation_case(
        session=session,
        client_id=payload.client_id,
        tx_id=payload.tx_id,
        severity=payload.severity,
        assigned_to=payload.assigned_to,
        initial_note=payload.initial_note
    )
    return {
        "message": "Investigation case created.",
        "case_id": case.case_id,
        "status": case.status,
        "severity": case.severity
    }


@router.patch("/cases/{case_id}")
def update_case_endpoint(
    case_id: str,
    payload: CaseUpdate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Update case status, resolution notes, or severity."""
    try:
        updated = update_investigation_case(
            session=session,
            case_id=case_id,
            status=payload.status,
            severity=payload.severity,
            assigned_to=payload.assigned_to,
            resolution_notes=payload.resolution_notes,
            changed_by=payload.changed_by
        )
        return {
            "message": "Case updated successfully.",
            "case_id": updated.case_id,
            "status": updated.status,
            "severity": updated.severity,
            "resolution_notes": updated.resolution_notes,
            "resolved_at": updated.resolved_at
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/cases/{case_id}/notes")
def add_case_note_endpoint(
    case_id: str,
    payload: CaseNoteCreate,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Append analyst note to a case."""
    try:
        note = add_case_note(
            session=session,
            case_id=case_id,
            note_text=payload.note_text,
            author_id=payload.author_id
        )
        return {
            "message": "Case note added.",
            "note_id": note.note_id,
            "case_id": note.case_id,
            "author_id": note.author_id,
            "created_at": note.created_at
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==========================================
# 5. NOTIFICATIONS
# ==========================================

@router.get("/notifications")
def list_notifications(
    client_id: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """List notification logs and delivery statuses."""
    query = select(Notification)
    if client_id:
        query = query.where(Notification.client_id == client_id)

    total = session.exec(select(func.count(Notification.notification_id))).one()
    items = session.exec(query.order_by(desc(Notification.attempted_at)).offset(offset).limit(limit)).all()

    return {"total": total, "items": items, "limit": limit, "offset": offset}


@router.post("/notifications/send")
def send_notification_endpoint(
    payload: NotificationSendRequest,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Dispatch alert notification with truthful SIMULATED status tracking."""
    notif = send_notification(
        session=session,
        client_id=payload.client_id,
        recipient=payload.recipient,
        message=payload.message,
        channel=payload.channel,
        tx_id=payload.tx_id,
        case_id=payload.case_id,
        simulated=False
    )
    return {
        "message": f"Notification dispatched via {notif.channel} gateway ({notif.status}).",
        "notification_id": notif.notification_id,
        "status": notif.status,
        "channel": notif.channel,
        "recipient": notif.recipient,
        "provider_message_id": notif.provider_message_id,
        "error_message": notif.error_message,
        "attempted_at": notif.attempted_at
    }


@router.post("/notifications/{notification_id}/retry")
def retry_notification_endpoint(
    notification_id: str,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Safe notification retry."""
    try:
        retried = retry_notification(session=session, notification_id=notification_id)
        return {
            "message": "Notification retry attempted.",
            "notification_id": retried.notification_id,
            "status": retried.status,
            "attempted_at": retried.attempted_at
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ==========================================
# 6. AUDIT RECORDS
# ==========================================

@router.get("/audit-logs")
def list_audit_logs(
    entity_type: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session)
) -> Dict[str, Any]:
    """Retrieve system audit logs for administrative transparency."""
    query = select(AuditRecord)
    if entity_type:
        query = query.where(AuditRecord.entity_type == entity_type.upper())

    total = session.exec(select(func.count(AuditRecord.audit_id))).one()
    items = session.exec(query.order_by(desc(AuditRecord.changed_at)).offset(offset).limit(limit)).all()

    return {"total": total, "items": items, "limit": limit, "offset": offset}

