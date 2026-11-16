"""Business operations for Banking AI Monitoring:
- Investigation Case management & notes
- Customer profile modifications with audit history
- Financial transaction audited corrections
- Real SMTP Email & SMS dispatch with truthful SIMULATED fallback
- Audit trail logging
"""

from datetime import datetime, timezone
import json
import logging
import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import uuid
from typing import Any, Dict, List, Optional
import requests
from dotenv import load_dotenv
from sqlmodel import Session, select

from .models import (
    Customer,
    Transaction,
    InvestigationCase,
    CaseNote,
    Notification,
    AuditRecord,
    utc_now
)

load_dotenv()
logger = logging.getLogger(__name__)


def log_audit_entry(
    session: Session,
    entity_type: str,
    entity_id: str,
    action: str,
    changed_by: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    reason: Optional[str] = None
) -> AuditRecord:
    """Create and persist an audit trail record."""
    audit = AuditRecord(
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        old_value=old_value,
        new_value=new_value,
        changed_by=changed_by,
        changed_at=utc_now(),
        reason=reason
    )
    session.add(audit)
    session.commit()
    session.refresh(audit)
    return audit


def update_customer_profile(
    session: Session,
    client_id: str,
    name: Optional[str],
    email: Optional[str],
    phone: Optional[str],
    reason: str,
    changed_by: str = "Analyst"
) -> Customer:
    """Safely update permitted customer profile fields and write an audit record."""
    customer = session.get(Customer, client_id)
    if not customer:
        raise ValueError(f"Customer {client_id} not found.")

    old_state = {
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone
    }

    if name is not None:
        customer.name = name
    if email is not None:
        customer.email = email
    if phone is not None:
        customer.phone = phone

    customer.updated_at = utc_now()
    session.add(customer)
    session.commit()
    session.refresh(customer)

    new_state = {
        "name": customer.name,
        "email": customer.email,
        "phone": customer.phone
    }

    log_audit_entry(
        session=session,
        entity_type="CUSTOMER",
        entity_id=client_id,
        action="PROFILE_UPDATE",
        changed_by=changed_by,
        old_value=json.dumps(old_state),
        new_value=json.dumps(new_state),
        reason=reason
    )
    return customer


def correct_transaction(
    session: Session,
    tx_id: str,
    reason: str,
    changed_by: str = "Analyst",
    corrected_amount: Optional[float] = None,
    corrected_recipient: Optional[str] = None,
    corrected_location: Optional[str] = None
) -> Transaction:
    """Audited correction of a transaction without silently overwriting history."""
    tx = session.get(Transaction, tx_id)
    if not tx:
        raise ValueError(f"Transaction {tx_id} not found.")

    old_data = {
        "amount": tx.amount,
        "recipient": tx.recipient,
        "location": tx.location
    }

    if corrected_amount is not None:
        tx.amount = corrected_amount
    if corrected_recipient is not None:
        tx.recipient = corrected_recipient
    if corrected_location is not None:
        tx.location = corrected_location

    session.add(tx)
    session.commit()
    session.refresh(tx)

    new_data = {
        "amount": tx.amount,
        "recipient": tx.recipient,
        "location": tx.location
    }

    log_audit_entry(
        session=session,
        entity_type="TRANSACTION",
        entity_id=tx_id,
        action="TRANSACTION_CORRECTION",
        changed_by=changed_by,
        old_value=json.dumps(old_data),
        new_value=json.dumps(new_data),
        reason=reason
    )
    return tx


def create_investigation_case(
    session: Session,
    client_id: str,
    tx_id: str,
    severity: str = "MEDIUM",
    assigned_to: Optional[str] = "Lead Analyst",
    initial_note: Optional[str] = None
) -> InvestigationCase:
    """Open an investigation case for a flagged transaction."""
    existing = session.exec(
        select(InvestigationCase).where(InvestigationCase.tx_id == tx_id)
    ).first()
    if existing:
        return existing

    case_id = f"CASE-{uuid.uuid4().hex[:8].upper()}"
    now = utc_now()

    case = InvestigationCase(
        case_id=case_id,
        client_id=client_id,
        tx_id=tx_id,
        status="OPEN",
        severity=severity,
        assigned_to=assigned_to or "Lead Analyst",
        created_at=now,
        updated_at=now
    )
    session.add(case)
    session.commit()
    session.refresh(case)

    if initial_note:
        note = CaseNote(
            case_id=case_id,
            author_id=assigned_to or "Lead Analyst",
            note_text=initial_note,
            created_at=now
        )
        session.add(note)
        session.commit()

    log_audit_entry(
        session=session,
        entity_type="CASE",
        entity_id=case_id,
        action="CASE_OPENED",
        changed_by=assigned_to or "Lead Analyst",
        new_value=json.dumps({"status": "OPEN", "severity": severity, "tx_id": tx_id}),
        reason="Automated suspicious anomaly alert flagged for investigation."
    )
    return case


def update_investigation_case(
    session: Session,
    case_id: str,
    status: Optional[str] = None,
    severity: Optional[str] = None,
    assigned_to: Optional[str] = None,
    resolution_notes: Optional[str] = None,
    changed_by: str = "Analyst"
) -> InvestigationCase:
    """Update investigation case status, severity, assignment, or resolution notes."""
    case = session.get(InvestigationCase, case_id)
    if not case:
        raise ValueError(f"Investigation case {case_id} not found.")

    old_state = {
        "status": case.status,
        "severity": case.severity,
        "assigned_to": case.assigned_to,
        "resolution_notes": case.resolution_notes
    }

    now = utc_now()
    case.updated_at = now

    if status is not None:
        case.status = status
        if status in ["RESOLVED", "FALSE_POSITIVE"]:
            case.resolved_at = now

    if severity is not None:
        case.severity = severity
    if assigned_to is not None:
        case.assigned_to = assigned_to
    if resolution_notes is not None:
        case.resolution_notes = resolution_notes

    session.add(case)
    session.commit()
    session.refresh(case)

    new_state = {
        "status": case.status,
        "severity": case.severity,
        "assigned_to": case.assigned_to,
        "resolution_notes": case.resolution_notes
    }

    log_audit_entry(
        session=session,
        entity_type="CASE",
        entity_id=case_id,
        action="CASE_UPDATE",
        changed_by=changed_by,
        old_value=json.dumps(old_state),
        new_value=json.dumps(new_state),
        reason=f"Status: {case.status}. Notes: {resolution_notes or 'Updated by analyst'}"
    )
    return case


def add_case_note(
    session: Session,
    case_id: str,
    note_text: str,
    author_id: str = "Analyst"
) -> CaseNote:
    """Append an analyst note to a case history."""
    case = session.get(InvestigationCase, case_id)
    if not case:
        raise ValueError(f"Investigation case {case_id} not found.")

    note = CaseNote(
        case_id=case_id,
        author_id=author_id,
        note_text=note_text,
        created_at=utc_now()
    )
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


# ==============================================================================
# Live & Simulated Dispatch Providers
# ==============================================================================

def _dispatch_real_email(recipient: str, subject: str, message_body: str) -> Dict[str, Any]:
    """Attempt live SMTP email dispatch if SMTP_USER and SMTP_PASSWORD are set."""
    load_dotenv(override=True)
    host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    port = int(os.getenv("SMTP_PORT", "587"))
    user = os.getenv("SMTP_USER", "").strip()
    raw_password = os.getenv("SMTP_PASSWORD", "").strip()
    from_email = os.getenv("SMTP_FROM_EMAIL") or os.getenv("COMPANY_EMAIL") or user
    from_name = os.getenv("SMTP_FROM_NAME", "BankGuard AI Security")
    use_tls = os.getenv("SMTP_USE_TLS", "True").lower() in ["true", "1", "yes"]

    if not user or not raw_password:
        return {
            "status": "SIMULATED",
            "provider_message_id": f"SIM-SMTP-{uuid.uuid4().hex[:10]}",
            "error": None,
            "note": "SMTP credentials not provided in .env; recorded in simulated sandbox mode."
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{from_name} <{from_email}>"
        msg["To"] = recipient
        msg["Subject"] = subject
        msg.attach(MIMEText(message_body, "plain"))

        server = smtplib.SMTP(host, port, timeout=10)
        if use_tls:
            server.starttls()
        
        # Google App Passwords work both with and without spaces
        try:
            server.login(user, raw_password)
        except Exception:
            server.login(user, raw_password.replace(" ", ""))

        server.sendmail(from_email, [recipient], msg.as_string())
        server.quit()

        return {
            "status": "SENT",
            "provider_message_id": f"SMTP-{uuid.uuid4().hex[:12].upper()}",
            "error": None,
            "note": f"Live email successfully dispatched via {host}:{port}"
        }
    except Exception as e:
        logger.error(f"Live SMTP email failed: {e}")
        return {
            "status": "FAILED",
            "provider_message_id": None,
            "error": str(e),
            "note": "SMTP transmission failure."
        }


def _dispatch_real_sms(recipient: str, message_body: str) -> Dict[str, Any]:
    """Attempt live SMS dispatch via Fast2SMS or Twilio if configured."""
    load_dotenv(override=True)
    fast2sms_key = os.getenv("FAST2SMS_API_KEY", "").strip()
    account_sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    auth_token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    from_number = os.getenv("TWILIO_FROM_NUMBER", "").strip()
    provider = os.getenv("SMS_PROVIDER", "FAST2SMS" if fast2sms_key else "TWILIO").upper()

    # Option 1: Fast2SMS (Indian Gateway)
    if (provider == "FAST2SMS" or (fast2sms_key and not account_sid)) and fast2sms_key:
        try:
            # Clean recipient phone to 10-digit Indian number
            clean_digits = "".join(filter(str.isdigit, recipient))
            if len(clean_digits) > 10 and clean_digits.startswith("91"):
                clean_number = clean_digits[2:]
            else:
                clean_number = clean_digits[-10:] if len(clean_digits) >= 10 else clean_digits

            url = "https://www.fast2sms.com/dev/bulkV2"
            headers = {
                "authorization": fast2sms_key,
                "Content-Type": "application/x-www-form-urlencoded"
            }
            payload = {
                "route": "q",
                "message": message_body,
                "language": "english",
                "flash": 0,
                "numbers": clean_number
            }
            res = requests.post(url, data=payload, headers=headers, timeout=10)
            res_data = res.json()
            if res.status_code == 200 and res_data.get("return") is True:
                return {
                    "status": "SENT",
                    "provider_message_id": f"F2SMS-{res_data.get('request_id', uuid.uuid4().hex[:8])}",
                    "error": None
                }
            else:
                raw_err = res_data.get("message")
                if isinstance(raw_err, list) and len(raw_err) > 0:
                    err_msg = str(raw_err[0])
                else:
                    err_msg = str(raw_err or "Fast2SMS dispatch error")
                
                # Helpfully explain status 999
                if res_data.get("status_code") == 999:
                    err_msg = "Fast2SMS API locked: Account requires minimum ₹100 transaction on fast2sms.com to unlock external API route."

                return {
                    "status": "FAILED",
                    "provider_message_id": None,
                    "error": err_msg
                }
        except Exception as e:
            return {"status": "FAILED", "provider_message_id": None, "error": str(e)}

    # Option 2: Twilio Gateway
    if account_sid and auth_token and from_number:
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{account_sid}/Messages.json"
            res = requests.post(
                url,
                data={"From": from_number, "To": recipient, "Body": message_body},
                auth=(account_sid, auth_token),
                timeout=10
            )
            if res.status_code in [200, 201]:
                sid = res.json().get("sid", uuid.uuid4().hex[:10])
                return {"status": "SENT", "provider_message_id": sid, "error": None}
            else:
                err_msg = res.json().get("message", res.text)
                return {"status": "FAILED", "provider_message_id": None, "error": err_msg}
        except Exception as e:
            return {"status": "FAILED", "provider_message_id": None, "error": str(e)}

    # Fallback to simulated mode
    return {
        "status": "SIMULATED",
        "provider_message_id": f"SIM-SMS-{uuid.uuid4().hex[:8]}",
        "error": None
    }


def send_notification(
    session: Session,
    client_id: str,
    recipient: str,
    message: str,
    channel: str = "EMAIL",
    tx_id: Optional[str] = None,
    case_id: Optional[str] = None,
    simulated: bool = False
) -> Notification:
    """Dispatch alert notification.

    If SMTP or SMS credentials exist in .env, delivers actual live message and records SENT.
    If no gateway credentials exist or error occurs, truthfully tracks status (SIMULATED or FAILED).
    """
    notif_id = f"NOTIF-{uuid.uuid4().hex[:8].upper()}"
    now = utc_now()
    ch = channel.upper()

    if simulated:
        status = "SIMULATED"
        provider_msg_id = f"SIM-{ch}-{uuid.uuid4().hex[:8]}"
        error_msg = None
    elif ch == "EMAIL":
        subject = f"Security Alert: Unusual Banking Activity Notification [{client_id}]"
        dispatch = _dispatch_real_email(recipient, subject, message)
        status = dispatch["status"]
        provider_msg_id = dispatch["provider_message_id"]
        error_msg = dispatch["error"]
    elif ch == "SMS":
        dispatch = _dispatch_real_sms(recipient, message)
        status = dispatch["status"]
        provider_msg_id = dispatch["provider_message_id"]
        error_msg = dispatch["error"]
    else:
        status = "SENT"
        provider_msg_id = f"INAPP-{uuid.uuid4().hex[:8]}"
        error_msg = None

    notif = Notification(
        notification_id=notif_id,
        client_id=client_id,
        case_id=case_id,
        tx_id=tx_id,
        channel=ch,
        recipient=recipient,
        message=message,
        status=status,
        provider_message_id=provider_msg_id,
        error_message=error_msg,
        attempted_at=now,
        created_at=now
    )
    session.add(notif)
    session.commit()
    session.refresh(notif)

    log_audit_entry(
        session=session,
        entity_type="NOTIFICATION",
        entity_id=notif_id,
        action="NOTIFICATION_DISPATCH",
        changed_by="system",
        new_value=json.dumps({"channel": ch, "status": status, "recipient": recipient}),
        reason=f"Security alert notification dispatched via {ch} gateway ({status})."
    )
    return notif


def retry_notification(
    session: Session,
    notification_id: str
) -> Notification:
    """Safely retry sending a failed or pending notification without duplicate explosion."""
    notif = session.get(Notification, notification_id)
    if not notif:
        raise ValueError(f"Notification {notification_id} not found.")

    now = utc_now()
    notif.attempted_at = now

    ch = notif.channel.upper()
    if ch == "EMAIL":
        subject = f"Security Alert Retry: Unusual Banking Activity [{notif.client_id}]"
        dispatch = _dispatch_real_email(notif.recipient, subject, notif.message)
        notif.status = dispatch["status"]
        notif.provider_message_id = dispatch["provider_message_id"]
        notif.error_message = dispatch["error"]
    elif ch == "SMS":
        dispatch = _dispatch_real_sms(notif.recipient, notif.message)
        notif.status = dispatch["status"]
        notif.provider_message_id = dispatch["provider_message_id"]
        notif.error_message = dispatch["error"]
    else:
        notif.status = "SENT"
        notif.provider_message_id = f"INAPP-RETRY-{uuid.uuid4().hex[:8]}"
        notif.error_message = None

    session.add(notif)
    session.commit()
    session.refresh(notif)
    return notif
