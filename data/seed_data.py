"""Generate realistic sample Indian banking data with baselines, transactions, and anomalies.

Ensures:
- Indian customer archetypes and currency in Indian Rupees (₹)
- 30-day baseline transaction history (UPI, IMPS, RTGS, Cards)
- Multi-signal suspicious anomalies with explainable reasons
- Clear distinction between ground_truth_is_fraud (offline eval only) and live risk score
- Pre-seeded cases, notes, notifications, and audit records
"""

from datetime import datetime, timedelta, timezone
import json
import random
from typing import List
from sqlmodel import Session, select

from backend.database import engine, init_db
from backend.models import (
    Customer,
    Transaction,
    RiskDetail,
    InvestigationCase,
    CaseNote,
    Notification,
    AuditRecord,
    utc_now
)
from backend.ai_engine import (
    evaluate_transaction_risk,
    compute_customer_baseline,
    forecast_daily_spending
)


def seed_database(force: bool = False) -> None:
    """Populate database with rich Indian banking demo data if empty or forced."""
    init_db()

    with Session(engine) as session:
        existing_cust = session.exec(select(Customer)).first()
        if existing_cust and not force:
            print("Database already contains data. Skipping seeding.")
            return

        if force:
            for model in [AuditRecord, CaseNote, Notification, InvestigationCase, RiskDetail, Transaction, Customer]:
                for item in session.exec(select(model)).all():
                    session.delete(item)
            session.commit()

        print("Generating Indian banking dataset (INR / ₹)...")
        now = datetime.now(timezone.utc)

        # 6 distinct Indian customer archetypes
        customers_data = [
            {
                "client_id": "CUST-1001",
                "name": "Rajesh Sharma",
                "email": "r.sharma@tcs.corp",
                "phone": "+91-98201-14309",
                "avg_daily_spend": 14500.00,
                "std_daily_spend": 4200.00,
                "avg_daily_tx_count": 3.2,
                "typical_locations": ["Mumbai, MH", "BKC Mumbai", "Navi Mumbai, MH", "Pune, MH"],
                "trusted_recipients": ["Swiggy", "Zomato", "Tata Power", "Flipkart", "Zerodha Broking"],
                "typical_payment_methods": ["UPI", "NETBANKING", "CARD_ONLINE"]
            },
            {
                "client_id": "CUST-1002",
                "name": "Priya Nair",
                "email": "priya.nair@infosys.com",
                "phone": "+91-98450-89123",
                "avg_daily_spend": 8200.00,
                "std_daily_spend": 2400.00,
                "avg_daily_tx_count": 3.8,
                "typical_locations": ["Bengaluru, KA", "Indiranagar", "Koramangala", "Whitefield"],
                "trusted_recipients": ["Zepto", "Blinkit", "Uber India", "BESCOM Electricity", "Cult.fit"],
                "typical_payment_methods": ["UPI", "CONTACTLESS", "APPLE_PAY"]
            },
            {
                "client_id": "CUST-1003",
                "name": "Amit Patel",
                "email": "amit.patel@gujarattextile.in",
                "phone": "+91-98790-67214",
                "avg_daily_spend": 22000.00,
                "std_daily_spend": 6500.00,
                "avg_daily_tx_count": 2.5,
                "typical_locations": ["Ahmedabad, GJ", "Gandhinagar, GJ", "Surat, GJ"],
                "trusted_recipients": ["D-Mart", "Torrent Power", "Adani Gas", "Indian Oil", "HDFC Life Insurance"],
                "typical_payment_methods": ["IMPS", "RTGS", "UPI"]
            },
            {
                "client_id": "CUST-1004",
                "name": "Ananya Iyer",
                "email": "ananya.iyer@creativehub.in",
                "phone": "+91-98401-32981",
                "avg_daily_spend": 4500.00,
                "std_daily_spend": 1400.00,
                "avg_daily_tx_count": 2.6,
                "typical_locations": ["Chennai, TN", "Anna Nagar, Chennai", "T. Nagar, Chennai"],
                "trusted_recipients": ["Amazon India", "Airtel Broadband", "Swiggy Instamart", "BookMyShow"],
                "typical_payment_methods": ["UPI", "DEBIT_CARD"]
            },
            {
                "client_id": "CUST-1005",
                "name": "Vikram Malhotra",
                "email": "v.malhotra@advocates.delhi",
                "phone": "+91-98110-91827",
                "avg_daily_spend": 18500.00,
                "std_daily_spend": 5800.00,
                "avg_daily_tx_count": 2.8,
                "typical_locations": ["South Delhi, DL", "Gurugram CyberCity, HR", "Noida, UP"],
                "trusted_recipients": ["DLF Golf Club", "Taj Hotels", "MakeMyTrip", "Tata Neu", "IndiGo Airlines"],
                "typical_payment_methods": ["CARD_ONLINE", "UPI", "IMPS"]
            },
            {
                "client_id": "CUST-1006",
                "name": "Sneha Kulkarni",
                "email": "sneha.kulkarni@kemhospital.org",
                "phone": "+91-98220-45591",
                "avg_daily_spend": 3200.00,
                "std_daily_spend": 950.00,
                "avg_daily_tx_count": 2.2,
                "typical_locations": ["Pune, MH", "Shivajinagar, Pune", "Baner, Pune", "Kothrud, Pune"],
                "trusted_recipients": ["BigBasket", "Apollo Pharmacy", "Swiggy", "MSEDCL Electricity", "MedPlus"],
                "typical_payment_methods": ["UPI", "DEBIT_CARD", "CONTACTLESS"]
            }
        ]

        # Insert customers
        for c in customers_data:
            customer = Customer(
                client_id=c["client_id"],
                name=c["name"],
                email=c["email"],
                phone=c["phone"],
                avg_daily_spend=c["avg_daily_spend"],
                std_daily_spend=c["std_daily_spend"],
                avg_daily_tx_count=c["avg_daily_tx_count"],
                typical_locations=json.dumps(c["typical_locations"]),
                trusted_recipients=json.dumps(c["trusted_recipients"]),
                typical_payment_methods=json.dumps(c["typical_payment_methods"]),
                created_at=now - timedelta(days=60),
                updated_at=now - timedelta(days=2)
            )
            session.add(customer)

        session.commit()

        # Generate 30 days of baseline history for each customer
        all_transactions: List[Transaction] = []
        tx_counter = 91000

        for c in customers_data:
            client_id = c["client_id"]
            typical_locs = c["typical_locations"]
            trusted_recips = c["trusted_recipients"]
            methods = c["typical_payment_methods"]
            avg_daily = c["avg_daily_spend"]

            for day_offset in range(30, 0, -1):
                day_date = now - timedelta(days=day_offset)
                num_tx = max(1, int(random.gauss(c["avg_daily_tx_count"], 0.8)))

                daily_total = 0.0
                for tx_idx in range(num_tx):
                    tx_counter += 1
                    tx_id = f"TXN-{tx_counter}"
                    tx_amt = round(max(50.0, random.gauss(avg_daily / num_tx, (avg_daily / num_tx) * 0.25)), 2)
                    daily_total += tx_amt
                    hour = random.choice([8, 9, 11, 12, 13, 15, 17, 18, 19, 20, 21])
                    minute = random.randint(0, 59)
                    tx_time = day_date.replace(hour=hour, minute=minute)

                    recipient = random.choice(trusted_recips)
                    location = random.choice(typical_locs)
                    method = random.choice(methods)

                    baseline_dict = {
                        "avg_daily_spend": c["avg_daily_spend"],
                        "std_daily_spend": c["std_daily_spend"],
                        "avg_tx_amount": round(c["avg_daily_spend"] / c["avg_daily_tx_count"], 2),
                        "avg_daily_tx_count": c["avg_daily_tx_count"],
                        "typical_locations": typical_locs,
                        "trusted_recipients": trusted_recips,
                        "typical_payment_methods": methods,
                        "has_sufficient_history": True
                    }

                    eval_result = evaluate_transaction_risk(
                        amount=tx_amt,
                        recipient=recipient,
                        location=location,
                        payment_method=method,
                        hour=hour,
                        daily_tx_count=tx_idx + 1,
                        daily_tx_total=daily_total,
                        customer_baseline=baseline_dict
                    )

                    txn = Transaction(
                        tx_id=tx_id,
                        client_id=client_id,
                        timestamp=tx_time,
                        recipient=recipient,
                        location=location,
                        payment_method=method,
                        amount=tx_amt,
                        daily_tx_count=tx_idx + 1,
                        daily_tx_total=round(daily_total, 2),
                        predicted_daily_spend=round(avg_daily, 2),
                        anomaly_score=eval_result["anomaly_score"],
                        risk_score=eval_result["risk_score"],
                        risk_grade=eval_result["risk_grade"],
                        risk_reasons=json.dumps(eval_result["reasons"]),
                        is_suspicious=eval_result["is_suspicious"],
                        ground_truth_is_fraud=0
                    )
                    session.add(txn)
                    all_transactions.append(txn)

            session.commit()

        # Inject realistic Indian banking suspicious anomalies
        anomalies = [
            {
                "client_id": "CUST-1001",  # Rajesh Sharma (Mumbai)
                "amount": 875000.00,       # ₹8,75,000 unverified international wire
                "recipient": "Apex Global Capital (Nicosia, Cyprus)",
                "location": "Nicosia, Cyprus",
                "payment_method": "INTERNATIONAL_WIRE",
                "hour": 2,
                "daily_count": 4,
                "daily_total": 895000.00,
                "ground_truth_is_fraud": 1,
                "case_severity": "CRITICAL",
                "case_note": "Critical security hold placed on account. ₹8.75 Lakhs offshore wire initiated at 02:40 AM outside customer's Mumbai baseline. Contacted client via IVR.",
                "days_ago": 0,
                "hours_ago": 3
            },
            {
                "client_id": "CUST-1002",  # Priya Nair (Bengaluru)
                "amount": 149999.00,       # High-velocity charges in Florida
                "recipient": "Miami Gadgets & Luxury Corp",
                "location": "Miami, FL, USA",
                "payment_method": "CARD_ONLINE",
                "hour": 23,
                "daily_count": 7,
                "daily_total": 285000.00,
                "ground_truth_is_fraud": 1,
                "case_severity": "HIGH",
                "case_note": "Rapid card testing and electronic retail charges in Miami, USA while client is active in Bengaluru. Temporary card block active.",
                "days_ago": 1,
                "hours_ago": 12
            },
            {
                "client_id": "CUST-1003",  # Amit Patel (Ahmedabad)
                "amount": 95000.00,        # Foreign ATM Cash withdrawal in Dubai
                "recipient": "Deira ATM Cash #402",
                "location": "Dubai, UAE",
                "payment_method": "ATM_CASH",
                "hour": 4,
                "daily_count": 4,
                "daily_total": 145000.00,
                "ground_truth_is_fraud": 1,
                "case_severity": "HIGH",
                "case_note": "Off-hours ATM cash drain in Dubai. Sent instant SMS verification to primary mobile number.",
                "days_ago": 0,
                "hours_ago": 1
            },
            {
                "client_id": "CUST-1005",  # Vikram Malhotra (Delhi NCR)
                "amount": 420000.00,       # ₹4,20,000 Luxury Watch (Authentic / False Positive)
                "recipient": "Geneva Luxury Horology",
                "location": "Geneva, Switzerland",
                "payment_method": "CARD_ONLINE",
                "hour": 15,
                "daily_count": 2,
                "daily_total": 438000.00,
                "ground_truth_is_fraud": 0,
                "case_severity": "MEDIUM",
                "case_note": "Client contacted fraud helpline and confirmed authorized luxury purchase during overseas business conference. Triage marked False Positive.",
                "days_ago": 2,
                "hours_ago": 30
            },
            {
                "client_id": "CUST-1006",  # Sneha Kulkarni (Pune, resident doctor)
                "amount": 85000.00,        # Rapid UPI crypto drain at 03:15 AM
                "recipient": "CryptoBridge P2P Exch",
                "location": "Bucharest, Romania",
                "payment_method": "CRYPTO_RAMP",
                "hour": 3,
                "daily_count": 3,
                "daily_total": 92000.00,
                "ground_truth_is_fraud": 1,
                "case_severity": "HIGH",
                "case_note": "Atypical 3 AM cryptocurrency ramp transfer. Netbanking credentials temporarily frozen pending user confirmation.",
                "days_ago": 1,
                "hours_ago": 18
            }
        ]

        for anom in anomalies:
            tx_counter += 1
            tx_id = f"TXN-{tx_counter}"
            client = next(c for c in customers_data if c["client_id"] == anom["client_id"])
            tx_time = now - timedelta(days=anom["days_ago"], hours=anom["hours_ago"])

            baseline_dict = {
                "avg_daily_spend": client["avg_daily_spend"],
                "std_daily_spend": client["std_daily_spend"],
                "avg_tx_amount": round(client["avg_daily_spend"] / client["avg_daily_tx_count"], 2),
                "avg_daily_tx_count": client["avg_daily_tx_count"],
                "typical_locations": client["typical_locations"],
                "trusted_recipients": client["trusted_recipients"],
                "typical_payment_methods": client["typical_payment_methods"],
                "has_sufficient_history": True
            }

            eval_result = evaluate_transaction_risk(
                amount=anom["amount"],
                recipient=anom["recipient"],
                location=anom["location"],
                payment_method=anom["payment_method"],
                hour=anom["hour"],
                daily_tx_count=anom["daily_count"],
                daily_tx_total=anom["daily_total"],
                customer_baseline=baseline_dict
            )

            flagged_tx = Transaction(
                tx_id=tx_id,
                client_id=anom["client_id"],
                timestamp=tx_time,
                recipient=anom["recipient"],
                location=anom["location"],
                payment_method=anom["payment_method"],
                amount=anom["amount"],
                daily_tx_count=anom["daily_count"],
                daily_tx_total=anom["daily_total"],
                predicted_daily_spend=round(client["avg_daily_spend"], 2),
                anomaly_score=eval_result["anomaly_score"],
                risk_score=eval_result["risk_score"],
                risk_grade=eval_result["risk_grade"],
                risk_reasons=json.dumps(eval_result["reasons"]),
                is_suspicious=eval_result["is_suspicious"],
                ground_truth_is_fraud=anom["ground_truth_is_fraud"]
            )
            session.add(flagged_tx)
            session.commit()

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

            case_id = f"CASE-{random.randint(1000, 9999)}"
            case_status = "FALSE_POSITIVE" if anom["ground_truth_is_fraud"] == 0 else random.choice(["OPEN", "UNDER_REVIEW"])
            resolved_at = tx_time + timedelta(hours=3) if case_status in ["RESOLVED", "FALSE_POSITIVE"] else None

            case = InvestigationCase(
                case_id=case_id,
                client_id=anom["client_id"],
                tx_id=tx_id,
                status=case_status,
                severity=anom["case_severity"],
                assigned_to="Senior Analyst Davis",
                resolution_notes="Verified with customer via secure callback. Transaction confirmed authentic." if case_status == "FALSE_POSITIVE" else None,
                created_at=tx_time + timedelta(minutes=5),
                updated_at=tx_time + timedelta(hours=1),
                resolved_at=resolved_at
            )
            session.add(case)
            session.commit()

            note = CaseNote(
                case_id=case_id,
                author_id="Senior Analyst Davis",
                note_text=anom["case_note"],
                created_at=tx_time + timedelta(minutes=15)
            )
            session.add(note)

            notif = Notification(
                notification_id=f"NOTIF-{random.randint(5000, 9999)}",
                client_id=anom["client_id"],
                case_id=case_id,
                tx_id=tx_id,
                channel="SMS" if anom["case_severity"] == "CRITICAL" else "EMAIL",
                recipient=client["phone"] if anom["case_severity"] == "CRITICAL" else client["email"],
                message=f"Bank Security Alert: Unusual transaction of ₹{anom['amount']:,.2f} detected for {anom['recipient']}. Reply YES to confirm or NO to block account.",
                status="SIMULATED",
                provider_message_id=f"SIM-TWILIO-{random.randint(100000, 999999)}",
                error_message=None,
                attempted_at=tx_time + timedelta(minutes=10),
                created_at=tx_time + timedelta(minutes=10)
            )
            session.add(notif)

            audit = AuditRecord(
                entity_type="CASE",
                entity_id=case_id,
                action="CASE_CREATED",
                changed_by="system",
                new_value=json.dumps({"status": case_status, "severity": anom["case_severity"]}),
                changed_at=tx_time + timedelta(minutes=5),
                reason="High-risk anomaly alert triggered automatic investigation ticket."
            )
            session.add(audit)

        session.commit()
        print("Database successfully seeded with realistic Indian banking dataset (Rupees / INR).")


if __name__ == "__main__":
    seed_database(force=True)
