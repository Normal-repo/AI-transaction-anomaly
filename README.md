# BankGuard AI: Banking Anomaly Detection & Risk Monitoring System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TimesFM](https://img.shields.io/badge/TimesFM-Google%20DeepMind-4285F4?logo=google&logoColor=white)](https://github.com/google-research/timesfm)
[![Python Tests](https://img.shields.io/badge/Pytest-14%20Passing-brightgreen?logo=pytest&logoColor=white)](https://pytest.org)
[![Currency](https://img.shields.io/badge/Currency-INR%20(%E2%82%B9)-blue)](https://en.wikipedia.org/wiki/Indian_rupee)

An explainable, India-forward banking transaction anomaly detection and risk intelligence platform engineered with a **React + TypeScript + Tailwind CSS** frontend and a **FastAPI + SQLite + SQLModel** backend.

---

## 1. Project Purpose & Core Workflow

Financial transaction monitoring requires fast, explainable, and accountable anomaly detection. High risk scores are **not proof of fraud**; they highlight unusual deviations from a customer's established baseline to empower human analysts to make informed decisions.

The application implements the complete analyst lifecycle:
```text
Dashboard Warning → Customer Baseline → Flagged Transaction → Explainable Risk Report → Investigation Case → Notification Alert → Immutable Audit Trail
```

### India-Forward Banking Focus
- **Currency:** Indian Rupees (`₹` / `INR`) formatted throughout all analytics and ledger views.
- **Payment Rails:** Native support for UPI, IMPS, RTGS, Netbanking, and Debit/Credit Cards.
- **Geolocations:** Major Indian commerce hubs including Mumbai, Bengaluru, Delhi NCR, Ahmedabad, Chennai, and Pune.
- **Customer Archetypes:** Salaried professionals, MSME traders, high-net-worth individuals, students, tech gig-workers, and senior citizens.

---

## 2. Technology Stack

### Frontend
- **React 18** with **TypeScript** for robust component design.
- **Vite** for fast modern bundling and hot-module reloading.
- **Tailwind CSS** for dark-mode financial intelligence UI.
- **Recharts** for interactive customer-specific spending trends, transaction velocity bars, and 7-day TimesFM horizon forecasts.
- **React Router v6** for multi-page navigation.
- **Lucide React** for clear, context-aware icons.

### Backend (Simple, Transparent & Modular)
- **FastAPI** (`/api/v1`) for asynchronous REST endpoints with auto-generated OpenAPI documentation.
- **SQLite** (`bank_monitor.db`) for lightweight local persistence.
- **SQLModel** (SQLAlchemy 2.0 + Pydantic v2) for typed models, migrations, and schema validation.
- **TimesFM (Google DeepMind)** + documented Exponential Moving Average (EMA) with outlier dampening for 7-day daily spend projections.
- **Scikit-Learn (IsolationForest)** for calibrated unsupervised multivariate density outlier scoring.
- **SMTP Gateway (smtplib)** for live email alerts directly to customer and fraud desk inboxes.
- **Pytest** for full unit and integration test coverage.

---

## 3. Mathematical Risk Scoring Formula

BankGuard AI computes a composite risk rating ($0 - 100$) combining explainable heuristic deviations with an unsupervised Isolation Forest anomaly score:

$$\Large S_{\text{total}} = 0.80 \times S_{\text{heuristic}} + 0.20 \times S_{\text{IForest}}$$

Where the heuristic baseline is a weighted linear combination of five orthogonal signals:

$$\Large S_{\text{heuristic}} = 0.35 s_{\text{amount}} + 0.25 s_{\text{velocity}} + 0.15 s_{\text{location}} + 0.15 s_{\text{recipient}} + 0.10 s_{\text{method\_timing}}$$

### Signal Breakdown
| Signal | Weight | Evaluation Criteria |
| :--- | :---: | :--- |
| **Amount Deviation** | **35%** | Ratio of transaction amount to customer's historical average single tx amount ($>10\times \to 95$, $>5\times \to 80$, $>2.5\times \to 55$, $>1.5\times \to 30$). |
| **Daily Velocity & Count** | **25%** | Same-day transaction frequency and cumulative daily spend vs rolling baseline ($\ge 4\times \to 90$, $\ge 2.5\times \to 65$, $\ge 1.5\times \to 35$). |
| **Location Familiarity** | **15%** | Cross-verification against verified activity clusters (Mumbai, Bengaluru, etc.). Cold-start is scored neutrally ($20.0$), not punitively. |
| **Recipient History** | **15%** | Verification against customer's trusted counterparty ledger ($70.0$ for unknown counterparties). |
| **Payment Method & Timing**| **10%** | Uncharacteristic payment rail ($+45$) and nocturnal high-value transfers between 23:00 - 05:00 ($+35$). |

### Continuous Risk Grades (No Gaps or Overlaps)
- **`NORMAL`** : $[0.0, 40.0)$ — Standard baseline activity, automatically cleared.
- **`LOW`** : $[40.0, 60.0)$ — Minor deviation (e.g. first-time merchant), retained in audit ledger.
- **`HIGH`** : $[60.0, 80.0)$ — Significant anomaly, escalated to analyst review queue.
- **`CRITICAL`** : $[80.0, 100.0]$ — Severe multi-signal violation, triggers immediate triage & customer alert.

---

## 4. Key Security & Compliance Rules

1. **Ground-Truth Label Isolation**:
   - `ground_truth_is_fraud` is strictly excluded from live inference, scoring, and alert generation. Live detection is fully unsupervised and compliance-ready.
2. **Audited Profile Corrections**:
   - Modifying a customer's baseline or contact information requires a mandatory analyst identity and justification reason, permanently stored in an immutable audit ledger.
3. **Truthful Dispatch Tracking**:
   - When configured with SMTP credentials, notifications deliver genuine live emails (`SENT`). In sandbox mode, statuses are recorded truthfully as `SIMULATED` with zero false claims of delivery.

---

## 5. Project Directory Structure

```text
.
├── backend/
│   ├── main.py              # FastAPI app lifecycle, CORS, static frontend mount
│   ├── database.py          # SQLite engine connection and table initialization
│   ├── models.py            # SQLModel database tables (Customer, Transaction, Case, Audit, etc.)
│   ├── schemas.py           # Pydantic request and response schemas
│   ├── routes.py            # Typed API route handlers (/api/v1)
│   ├── ai_engine.py         # Baseline estimator, TimesFM forecasting, multi-signal scoring
│   ├── operations.py        # Case management, audited corrections, live SMTP notifications
│   └── requirements.txt     # Python dependencies
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API client functions (client.ts)
│   │   ├── components/      # Badges, Tooltips, Modals (RiskReportModal, CustomerEditModal, etc.)
│   │   ├── pages/           # Dashboard, Customers, CustomerDetails, Transactions, Investigations, Notifications, AuditTrail, About
│   │   ├── types/           # TypeScript data interfaces
│   │   ├── App.tsx          # Application router & layout
│   │   └── main.tsx         # Entrypoint
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── data/
│   └── seed_data.py         # Realistic 30-day Indian banking dataset generator (archetypes + fraud scenarios)
├── tests/
│   ├── test_ai_engine.py    # Scoring reproducibility, continuous grades, label isolation tests
│   └── test_api.py          # End-to-end API integration & SMTP delivery tests
├── .env.example             # Safe environment template (no credentials)
├── .gitignore               # Strict exclusion of .env, databases, and local caches
└── README.md
```

---

## 6. Quickstart & Setup Guide

### Prerequisites
- **Python 3.10+**
- **Node.js 18+** or **Deno 2+**

### Step 1: Clone & Configure Environment
```bash
git clone https://github.com/Normal-repo/AI-transaction-anomaly.git
cd AI-transaction-anomaly

# Copy environment template
cp .env.example .env
```
Edit `.env` to configure your settings. To enable live email alerts, specify your Gmail or SMTP credentials:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_digit_app_password
SMTP_FROM_EMAIL=your_email@gmail.com
```

### Step 2: Install Python Dependencies & Seed Database
```bash
pip install -r backend/requirements.txt

# Generate realistic 30-day Indian banking seed data (6 archetypes, 366+ transactions)
python -m data.seed_data
```

### Step 3: Run Backend Service
```bash
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive Swagger API documentation will be available at `http://127.0.0.1:8000/docs`.

### Step 4: Run Frontend Development Server
In another terminal:
```bash
cd frontend
npm install   # or: deno run -A npm:vite
npm run dev
```
Open `http://localhost:5173` in your browser.

*(Note: Production builds placed in `frontend/dist` are also automatically served directly by FastAPI at `http://127.0.0.1:8000/`)*.

---

## 7. Running Tests

Run the complete 14-test suite covering AI inference, score calibration, grade continuity, and live API endpoints:
```bash
python -m pytest tests/ -v
```

All 14 tests verify:
- Strict continuous grade boundaries $[0.0, 100.0]$ with zero gaps.
- Ground truth fraud label isolation from live inference.
- Customer behavioral baseline calculations.
- Normal vs anomalous transaction detection.
- TimesFM and EMA spending forecasting fallback.
- Dashboard KPI generation.
- Audited customer profile modifications.
- Explainable risk reports with analyst disclaimers.
- Investigation case triage and case notes.
- Honest notification dispatch tracking and live SMTP email delivery.

---

## 8. License & Attribution

Designed and developed for explainable banking security monitoring. Built with open-source tools: FastAPI, React, SQLModel, Scikit-Learn, and Google DeepMind TimesFM research.
