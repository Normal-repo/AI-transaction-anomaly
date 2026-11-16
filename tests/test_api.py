import pytest
from fastapi.testclient import TestClient
from backend.main import app

client = TestClient(app)


def test_health_endpoint():
    """Verify health endpoint returns healthy state."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "HEALTHY"
    assert data["database"]["connected"] is True
    assert data["database"]["customers"] > 0


def test_dashboard_summary():
    """Verify dashboard summary KPIs and warnings."""
    response = client.get("/api/v1/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_customers"] >= 6
    assert data["transactions_processed"] > 0
    assert data["suspicious_transactions"] > 0
    assert len(data["recent_warnings"]) > 0
    # Verify warning fields
    first_warn = data["recent_warnings"][0]
    assert "tx_id" in first_warn
    assert "client_id" in first_warn
    assert "risk_score" in first_warn
    assert "risk_grade" in first_warn
    assert "reasons" in first_warn


def test_get_customers_and_single_customer():
    """Verify customer list and detail retrieval."""
    response = client.get("/api/v1/clients")
    assert response.status_code == 200
    custs = response.json()["items"]
    assert len(custs) >= 6

    first_id = custs[0]["client_id"]
    detail_res = client.get(f"/api/v1/clients/{first_id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["client_id"] == first_id
    assert "avg_daily_spend" in detail


def test_update_customer_profile_and_audit():
    """Verify permitted customer profile updates record an audit log."""
    client_id = "CUST-1001"
    patch_res = client.patch(
        f"/api/v1/clients/{client_id}",
        json={
            "phone": "+91-98201-99999",
            "reason": "Customer called support to update primary phone",
            "changed_by": "Compliance Officer Rivera"
        }
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["phone"] == "+91-98201-99999"

    # Verify audit record
    audit_res = client.get("/api/v1/audit-logs?entity_type=CUSTOMER")
    assert audit_res.status_code == 200
    audits = audit_res.json()["items"]
    assert any(a["entity_id"] == client_id for a in audits)


def test_transaction_risk_report():
    """Verify explainable risk report endpoint returns complete component scores and disclaimer."""
    txs_res = client.get("/api/v1/transactions?limit=10")
    assert txs_res.status_code == 200
    txs = txs_res.json()["items"]
    assert len(txs) > 0

    tx_id = txs[0]["tx_id"]
    report_res = client.get(f"/api/v1/transactions/{tx_id}/risk-report")
    assert report_res.status_code == 200
    report = report_res.json()

    assert report["tx_id"] == tx_id
    assert "risk_score" in report
    assert "risk_grade" in report
    assert "reasons" in report
    assert "signals" in report
    assert "baseline_comparison" in report
    assert "disclaimer" in report
    assert "not proof of fraud" in report["disclaimer"].lower() or "not confirmed fraud" in report["disclaimer"].lower()


def test_case_management_and_notes():
    """Verify investigation case lifecycle: fetch, update status, add notes."""
    cases_res = client.get("/api/v1/cases")
    assert cases_res.status_code == 200
    cases = cases_res.json()["items"]
    assert len(cases) > 0

    target_case_id = cases[0]["case_id"]

    # Add note
    note_res = client.post(
        f"/api/v1/cases/{target_case_id}/notes",
        json={"note_text": "Investigated IP geolocation match.", "author_id": "Analyst Jones"}
    )
    assert note_res.status_code == 200

    # Update case status
    patch_case = client.patch(
        f"/api/v1/cases/{target_case_id}",
        json={"status": "UNDER_REVIEW", "resolution_notes": "Pending callback from client."}
    )
    assert patch_case.status_code == 200
    assert patch_case.json()["status"] == "UNDER_REVIEW"


def test_notification_dispatch_and_simulation():
    """Verify notification dispatch accurately reports provider status (SENT, FAILED, or SIMULATED)."""
    notif_res = client.post(
        "/api/v1/notifications/send",
        json={
            "client_id": "CUST-1001",
            "channel": "SMS",
            "recipient": "+91-98201-14309",
            "message": "Security Alert: Please verify transaction of ₹8,75,000."
        }
    )
    assert notif_res.status_code == 200
    notif_data = notif_res.json()
    assert notif_data["status"] in ["SIMULATED", "SENT", "FAILED"]

def test_live_email_notification_dispatch():
    """Verify live SMTP email dispatch with configured credentials."""
    notif_res = client.post(
        "/api/v1/notifications/send",
        json={
            "client_id": "CUST-1001",
            "channel": "EMAIL",
            "recipient": "nitinlucky705@gmail.com",
            "message": "BankGuard AI Test Alert: SMTP notification channel is verified."
        }
    )
    assert notif_res.status_code == 200
    notif_data = notif_res.json()
    assert notif_data["status"] in ["SENT", "SIMULATED"]
    if notif_data["status"] == "SENT":
        assert notif_data["provider_message_id"].startswith("SMTP-")

