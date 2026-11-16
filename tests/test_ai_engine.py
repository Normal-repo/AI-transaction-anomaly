import inspect
import pytest
from backend.ai_engine import (
    assign_risk_grade,
    evaluate_transaction_risk,
    compute_customer_baseline,
    forecast_daily_spending,
    GRADE_NORMAL,
    GRADE_LOW,
    GRADE_HIGH,
    GRADE_CRITICAL
)


def test_grade_boundaries_strictly_continuous():
    """Verify all risk grade boundaries have no overlaps or gaps."""
    assert assign_risk_grade(0.0) == GRADE_NORMAL
    assert assign_risk_grade(39.9) == GRADE_NORMAL
    assert assign_risk_grade(40.0) == GRADE_LOW
    assert assign_risk_grade(59.9) == GRADE_LOW
    assert assign_risk_grade(60.0) == GRADE_HIGH
    assert assign_risk_grade(79.9) == GRADE_HIGH
    assert assign_risk_grade(80.0) == GRADE_CRITICAL
    assert assign_risk_grade(100.0) == GRADE_CRITICAL
    # Clamp testing
    assert assign_risk_grade(-10.0) == GRADE_NORMAL
    assert assign_risk_grade(150.0) == GRADE_CRITICAL


def test_ground_truth_label_strictly_isolated():
    """Verify ground_truth_is_fraud is NEVER in the AI risk evaluation signature."""
    sig = inspect.signature(evaluate_transaction_risk)
    param_names = list(sig.parameters.keys())
    assert "ground_truth_is_fraud" not in param_names
    assert "is_fraud" not in param_names
    assert "label" not in param_names


def test_customer_baseline_computation():
    """Verify customer baseline statistics calculation from history."""
    amounts = [50.0, 60.0, 40.0, 50.0, 55.0]
    locations = ["Seattle, WA", "Seattle, WA", "Bellevue, WA", "Seattle, WA", "Bellevue, WA"]
    recipients = ["Grocery A", "Coffee Shop", "Grocery A", "Gas Station", "Coffee Shop"]
    methods = ["CARD_ONLINE", "CARD_ONLINE", "CONTACTLESS", "CARD_ONLINE", "CONTACTLESS"]
    daily_totals = [110.0, 90.0, 55.0]
    daily_counts = [2, 2, 1]

    baseline = compute_customer_baseline(
        tx_amounts=amounts,
        tx_locations=locations,
        tx_recipients=recipients,
        tx_methods=methods,
        tx_daily_totals=daily_totals,
        tx_daily_counts=daily_counts
    )

    assert baseline["has_sufficient_history"] is True
    assert baseline["avg_tx_amount"] == 51.0
    assert "Seattle, WA" in baseline["typical_locations"]
    assert "Grocery A" in baseline["trusted_recipients"]
    assert baseline["avg_daily_spend"] > 0


def test_evaluate_normal_transaction():
    """A regular transaction at a known merchant within budget should score NORMAL."""
    baseline = {
        "avg_daily_spend": 100.0,
        "std_daily_spend": 30.0,
        "avg_tx_amount": 50.0,
        "avg_daily_tx_count": 2.0,
        "typical_locations": ["Seattle, WA"],
        "trusted_recipients": ["Whole Foods"],
        "typical_payment_methods": ["CARD_ONLINE"],
        "has_sufficient_history": True
    }

    result = evaluate_transaction_risk(
        amount=45.0,
        recipient="Whole Foods",
        location="Seattle, WA",
        payment_method="CARD_ONLINE",
        hour=12,
        daily_tx_count=1,
        daily_tx_total=45.0,
        customer_baseline=baseline
    )

    assert result["risk_grade"] == GRADE_NORMAL
    assert result["is_suspicious"] is False
    assert result["risk_score"] < 40.0


def test_evaluate_anomalous_transaction():
    """An uncharacteristic off-hours massive international transfer should score HIGH or CRITICAL."""
    baseline = {
        "avg_daily_spend": 80.0,
        "std_daily_spend": 25.0,
        "avg_tx_amount": 40.0,
        "avg_daily_tx_count": 2.0,
        "typical_locations": ["Chicago, IL"],
        "trusted_recipients": ["Target", "Aldi"],
        "typical_payment_methods": ["CONTACTLESS"],
        "has_sufficient_history": True
    }

    result = evaluate_transaction_risk(
        amount=9500.0,  # 230x typical transaction
        recipient="Unknown Offshore Holding",
        location="Cyprus",
        payment_method="INTERNATIONAL_WIRE",
        hour=3,  # 3 AM
        daily_tx_count=5,
        daily_tx_total=9700.0,
        customer_baseline=baseline
    )

    assert result["risk_grade"] in [GRADE_HIGH, GRADE_CRITICAL]
    assert result["is_suspicious"] is True
    assert result["risk_score"] >= 60.0
    assert len(result["reasons"]) > 0


def test_timesfm_or_fallback_forecasting():
    """Verify 7-day spending horizon forecast is produced with valid numbers."""
    history = [120.0, 115.0, 140.0, 130.0, 150.0, 145.0, 160.0]
    fc = forecast_daily_spending(history, horizon=7)

    assert len(fc["forecast"]) == 7
    assert fc["horizon"] == 7
    assert all(val >= 0.0 for val in fc["forecast"])
    assert fc["mean_forecast"] > 0.0
    assert "model_name" in fc

