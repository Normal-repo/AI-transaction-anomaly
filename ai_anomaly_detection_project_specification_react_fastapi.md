# Banking AI Anomaly Detection & Risk Monitoring System
## Revised Project Specification — React Frontend, Beginner-Friendly FastAPI Backend

This is the current project specification. It replaces the earlier Streamlit-based version.

**Main decision:** Use React for the frontend, but keep the backend deliberately simple: one FastAPI application, one SQLite database for the first working version, SQLModel for database models, and straightforward Python functions for the business logic. The goal is a working, understandable project—not an enterprise architecture full of unnecessary layers.

---

# 1. Project purpose

Build a banking transaction-monitoring application that:

1. Monitors transactions at customer and individual-transaction level.
2. Uses each customer's historical behaviour as a baseline.
3. Detects unusual activity and calculates an explainable risk score and grade.
4. Shows actionable suspicious-transaction warnings on the dashboard.
5. Provides customer-wise transaction history and visualisations.
6. Lets an analyst inspect the exact transaction that triggered a warning.
7. Supports opening, reviewing, editing, and closing investigation cases.
8. Supports safe customer-data corrections and audit history.
9. Completes a notification workflow and accurately displays delivery status.
10. Avoids unrelated charts and has no user-facing model-evaluation page.

A high risk score is **not proof of fraud**. The application identifies suspicious activity for review. A human investigation outcome must remain separate from the model's prediction.

# 2. Technology stack

## Frontend

| Technology | Responsibility |
|---|---|
| React | User interface |
| TypeScript | Safer, more understandable frontend code |
| Vite | Frontend development/build tool |
| Tailwind CSS | Styling |
| shadcn/ui | Reusable tables, dialogs, forms, badges, sidebar |
| Recharts | Customer-wise charts |
| React Router | Page navigation |
| Axios | Calling FastAPI endpoints |

## Backend — intentionally simple

| Technology | Responsibility |
|---|---|
| Python | Main programming language |
| FastAPI | API routes and application |
| SQLite | Local database for the first working version |
| SQLModel | Database tables and simple queries; combines Pydantic-style models with SQLAlchemy |
| Pydantic (through FastAPI/SQLModel) | Request validation |
| Pandas / NumPy | Data preparation |
| Scikit-learn | IsolationForest, if the existing implementation supports it |
| TimesFM | Forecasting, if the existing implementation works |
| pytest | Tests |

### Why this backend?

The backend should be easy to follow:

- One FastAPI application.
- A small number of Python files.
- SQLModel models that are close to the database structure.
- Normal Python functions for calculations and workflows.
- No microservices.
- No Redis, Celery, Kafka, message queues, or complex background workers in the first version.
- No repository/service/factory abstraction layers unless a real need appears.
- No Django.
- No requirement to learn PostgreSQL before the first working version.

SQLite is suitable for the local prototype and demonstration. Keep database access organised so PostgreSQL can be adopted later if deployment or concurrent usage requires it. Do not claim SQLite is the final production banking database.

# 3. High-level architecture

```text
React + TypeScript frontend
          |
          | HTTP requests (Axios)
          v
FastAPI backend (one application)
          |
          +---- API routes and validation
          |
          +---- Simple Python functions
          |       +-- customer operations
          |       +-- transaction operations
          |       +-- anomaly and risk calculations
          |       +-- investigation operations
          |       +-- notification workflow
          |
          +---- SQLModel
          |       |
          |       v
          |     SQLite database
          |
          +---- AI code
                  +-- existing TimesFM forecasting
                  +-- existing anomaly detection
                  +-- risk scoring and explanations
```

**Important:** React must never connect directly to SQLite. All reads and writes go through FastAPI. The frontend must not calculate risk scores; the backend owns that logic.

# 4. Simple project structure

Use this structure unless the existing repository already has a sensible equivalent:

```text
ai-fraud-detection/
│
├── backend/
│   ├── main.py              # Create FastAPI app and include routes
│   ├── database.py          # SQLite connection and table creation
│   ├── models.py            # SQLModel database models
│   ├── schemas.py           # Request/response schemas when needed
│   ├── routes.py            # API endpoints
│   ├── ai_engine.py         # Forecasting, anomaly detection, risk score
│   ├── operations.py        # Simple functions for cases and notifications
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Customers.tsx
│   │   │   ├── CustomerDetails.tsx
│   │   │   ├── Transactions.tsx
│   │   │   ├── TransactionDetails.tsx
│   │   │   ├── Investigations.tsx
│   │   │   └── Notifications.tsx
│   │   ├── api/             # Axios API functions
│   │   ├── types/           # TypeScript types
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   └── .env.example
│
├── data/                    # Local sample data only; exclude private data
├── tests/
├── README.md
└── .gitignore
```

Do not create every file in advance if it is not needed yet. Build incrementally. Keep route handlers short and move only reusable business calculations into `ai_engine.py` or `operations.py`.

# 5. Backend coding rules — keep it understandable

The backend is a learning project as well as a working application. Follow these rules:

1. Prefer ordinary Python functions with clear names.
2. Keep each function focused on one task.
3. Use type hints for function parameters and return values.
4. Add short comments where the logic is not obvious.
5. Avoid clever one-liners and unnecessary inheritance.
6. Avoid creating a class for every small operation.
7. Keep API route functions short: validate input, call a function, return the result.
8. Put anomaly/risk calculations in `ai_engine.py`.
9. Put case and notification workflow functions in `operations.py`.
10. Put database models in `models.py` and database setup in `database.py`.
11. Do not let React or route handlers duplicate the AI scoring formulas.
12. Do not add advanced infrastructure until the simple version is working.

Example of the expected style:

```python
def calculate_risk_score(amount_score: float, behaviour_score: float) -> float:
    score = (amount_score * 0.4) + (behaviour_score * 0.6)
    return round(max(0, min(score, 100)), 2)
```

This is only an illustration. Use the actual project's documented score components and weights; do not blindly adopt these example weights.

# 6. Database models and data rules

Use SQLModel for straightforward table definitions and queries. Use foreign keys for relationships. Store timestamps consistently. Add indexes to frequently filtered fields such as customer ID, transaction timestamp, risk grade, and case status when useful.

## 6.1 Customer

Suggested fields:

- `client_id` — primary key
- `name`
- `email` — optional
- `phone` — optional
- `avg_daily_spend`
- `std_daily_spend` — when enough history exists
- `avg_daily_tx_count`
- `typical_locations`
- `trusted_recipients`
- `typical_payment_methods`
- `created_at`
- `updated_at`

Only add a customer-level `risk_score` if a clear aggregation formula is implemented. It is not the same as an individual transaction's risk score.

Authorised users can correct permitted customer/profile fields. Validate edits and record what changed, who changed it, when, and why.

## 6.2 Transaction

Suggested fields:

- `tx_id` — primary key
- `client_id` — foreign key to customer
- `timestamp`
- `recipient`
- `location`
- `payment_method`
- `amount`
- `daily_tx_count` — derived context, if calculated
- `daily_tx_total` — derived context, if calculated
- `predicted_daily_spend` — optional, only when forecast is valid and aligned
- `anomaly_score`
- `risk_score`
- `risk_grade` — `NORMAL`, `LOW`, `HIGH`, `CRITICAL`
- `risk_reasons`
- `is_suspicious`
- `ground_truth_is_fraud` — optional dataset label for offline evaluation only

### Transaction correctness rules

- Do not call a model prediction `is_fraud`.
- A high score does not prove fraud.
- Never use `ground_truth_is_fraud` as an input to live inference, anomaly detection, scoring, or alert generation.
- Financial transactions should not be freely editable after ingestion.
- If a correction is required, preserve the original value and record the corrected value, editor, time, and reason.
- Derived daily counts/totals must be calculated consistently by the backend.

## 6.3 Risk details

Persist the signals actually calculated:

- Transaction ID
- Forecast score, if available
- Behaviour score
- Amount score
- Frequency score
- Location score
- Recipient score
- Payment-method score
- Time/device scores only if source data exists
- Anomaly score
- Final risk score and grade
- Reason codes and descriptions
- Evaluation timestamp
- Model/rule version, if available

Document the scale and meaning of every displayed component. Do not show proposed signals that are not implemented.

## 6.4 Investigation case

Suggested fields:

- `case_id`
- `client_id`
- `tx_id`
- `status`: `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `FALSE_POSITIVE`
- `severity`: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `assigned_to` — optional
- `resolution_notes`
- `created_at`
- `updated_at`
- `resolved_at`

Analysts can open a case, review it, change permitted fields, add notes, resolve/close it, and mark it false positive. Preserve case history.

## 6.5 Case notes

- `note_id`
- `case_id`
- `author_id` — optional in a local prototype
- `note_text`
- `created_at`

## 6.6 Notifications

- `notification_id`
- `client_id`
- `case_id` or `tx_id`, where relevant
- `channel`
- `recipient`
- `message`
- `status`: `PENDING`, `SENT`, `DELIVERED`, `FAILED`, `SIMULATED`
- `provider_message_id`
- `error_message`
- `attempted_at`
- `created_at`

Only show `DELIVERED` when the provider confirms delivery. If no provider is configured, save a `SIMULATED` attempt. Never display a fake success.

## 6.7 Audit records

Keep a simple audit table for customer edits, transaction corrections, and important case changes:

- `audit_id`
- `entity_type`
- `entity_id`
- `action`
- `old_value`
- `new_value`
- `changed_by`
- `changed_at`
- `reason`

Do not log passwords, tokens, or unnecessary sensitive data.

# 7. AI engine

## 7.1 Customer behavioural baseline

Use historical transactions to calculate, where data permits:

- Average and median daily spend.
- Standard deviation of daily spend.
- Typical individual transaction amount.
- Average daily transaction count.
- Frequent locations.
- Frequent recipients.
- Common payment methods.
- Typical transaction hours, if timestamps are available.

A rolling 30-day baseline is a reasonable initial target, but handle customers with less history. Clearly indicate insufficient history instead of inventing normal behaviour.

## 7.2 TimesFM forecasting

Reuse the existing TimesFM implementation if it works and is compatible with the input data.

- Forecast daily aggregated spending, not an individual transaction amount.
- Use a 7-day horizon only if supported by the installed model/configuration.
- Record model name and whether a fallback was used.
- If TimesFM is unavailable, use a simple documented moving-average or exponential-smoothing fallback.
- Do not retrain the forecasting model for every transaction.

## 7.3 Anomaly signals

Use only signals supported by available fields:

- Amount compared with the customer's usual amount.
- Transaction frequency compared with baseline.
- Transaction velocity, if timestamps allow.
- New/unusual location.
- New/unusual recipient.
- Unusual payment method.
- Forecast deviation from correctly aligned daily totals.
- Time/device/behaviour changes only when the relevant data exists.

Missing data must not silently become a high-risk signal.

## 7.4 Risk score and grade

The previous draft suggested:

`S_total = 0.4 * S_forecast + 0.6 * S_behavior`

Use this only if both components are on compatible documented scales and forecast data is valid. Define what happens when forecasting is unavailable. Do not blindly treat missing forecast values as zero or high risk.

IsolationForest may be reused if its feature preparation, training data, and output calibration are genuinely implemented. A transparent rule-based baseline is acceptable for the first working version. Do not describe a rule as a trained model.

Define all four grade boundaries in one place with no gaps or overlaps:
- `NORMAL`
- `LOW`
- `HIGH`
- `CRITICAL`

Persist the component scores and reasons. Identical inputs and configuration should produce reproducible scores.

## 7.5 Risk report

Every flagged transaction must have a readable report containing:

- Risk score and grade.
- Reasons it was flagged.
- Contributing signals and component scores.
- Relevant comparison with customer baseline.
- Forecast context only if valid and aligned.
- Missing data that limited the assessment.
- A clear statement that this is a risk assessment for human review, not proof of fraud.

Only show reasons supported by actual calculations.

## 7.6 Model evaluation scope

Do not build a model-evaluation page or model-comparison dashboard. Offline engineering evaluation is outside the user-facing application scope.

# 8. FastAPI API routes

Use a consistent prefix such as `/api/v1`. Keep route functions short and readable. Use SQLModel sessions and simple helper functions.

### Dashboard

- `GET /api/v1/dashboard/summary` — counts and active warnings with customer and transaction context.

### Customers

- `GET /api/v1/clients`
- `GET /api/v1/clients/{client_id}`
- `PATCH /api/v1/clients/{client_id}` — validated permitted edits with audit history.
- `GET /api/v1/clients/{client_id}/transactions`
- `GET /api/v1/clients/{client_id}/analytics`

### Transactions and risk

- `GET /api/v1/transactions` — filters for Customer ID, date, grade, suspicious status, etc.
- `GET /api/v1/transactions/{tx_id}`
- `GET /api/v1/transactions/{tx_id}/risk-report`
- `POST /api/v1/transactions` — ingest, evaluate, and persist.
- `POST /api/v1/transactions/{tx_id}/corrections` — optional audited correction.

### Investigations

- `GET /api/v1/cases`
- `POST /api/v1/cases`
- `GET /api/v1/cases/{case_id}` — complete customer, transaction, risk, and notes context.
- `PATCH /api/v1/cases/{case_id}`
- `POST /api/v1/cases/{case_id}/notes`

### Notifications

- `GET /api/v1/notifications`
- `POST /api/v1/notifications/send`
- `POST /api/v1/notifications/{notification_id}/retry` — only with safe retry handling.

Do not implement an endpoint unless the UI or a real workflow needs it. Add pagination and clear validation/error responses.

# 9. React frontend requirements

The main workflow is:

**Dashboard warning → Customer → Flagged transaction → Risk report → Investigation → Notification**

## Page 1 — Dashboard

Show:
- Total customers.
- Transactions processed in selected period.
- Suspicious transactions requiring attention.
- High/critical risk alerts.
- Open investigations.
- Recent warning list.

Warnings should include Customer ID, transaction ID, date/time, amount, risk score/grade, reasons, case status, and an action to open details.

Do not fill the dashboard with unrelated charts.

## Page 2 — Customers

This is a primary part of the product.

Show a customer table with:
- Customer ID.
- Customer name or permitted display identifier.
- Warning status.
- Recent suspicious transaction count.
- Customer risk summary only if a defined customer-level calculation exists.

Selecting a customer opens:
- Customer information and permitted editable fields.
- Behavioural baseline.
- Transaction history and filters.
- Flagged transactions and their grades.
- Customer-wise daily spending and transaction-count charts.
- Recipient/location/payment-method breakdowns only when useful and supported by the data.

## Page 3 — Transactions

The primary browsing experience must be customer-oriented:

- Search/filter by Customer ID.
- Customer-grouped browsing.
- Date range.
- Risk grade and suspicious status.
- Recipient, location, payment method, where available.
- Individual transaction rows showing transaction ID, Customer ID, timestamp, amount, risk grade, and status.

Do not remove individual transaction identity. Selecting a row opens full details and the risk report.

## Transaction details and risk report

Accessible from dashboard warnings, customer pages, transaction list, and investigations. Show customer details, transaction details, risk grade/score, reasons, contributing signals, baseline comparison, valid forecast context, and case/notification status.

## Information icons

Add small info icons beside technical fields. On hover/click, explain the field's meaning, units/score range, and use. Examples: `risk_score`, `risk_grade`, `anomaly_score`, `forecast_deviation`, `daily_tx_count`, `daily_tx_total`.

Descriptions must match the actual code. Do not invent definitions.

## Page 4 — Investigations

Provide a case list filterable by status, severity, and Customer ID.

The case detail must show:
- Customer information.
- Full marked-transaction details.
- Risk score, grade, and complete risk report.
- Anomaly signal details.
- Relevant customer baseline.
- Notification history/status.
- Case status, severity, assignment, notes, and timestamps.

Allow permitted case edits, notes, status changes, resolution, closure, and false-positive marking. Preserve an audit trail.

## Page 5 — Notifications

Show notification history and allow a user to:
- Select a customer and relevant case/transaction.
- Select an available channel.
- Review/edit a message template.
- Send through a configured provider or create a clearly labelled simulated attempt.
- View recipient, channel, time, status, and provider error/result.
- Retry safely where supported.

Never claim a simulated or failed message was sent/delivered.

# 10. Authentication and permissions

Do not overcomplicate the first local prototype. However, before deployment or use with real customer information:

- Add login/authentication.
- Add at least two roles: `ANALYST` and `ADMIN`.
- Analysts can view transactions, create/manage cases, and add notes.
- Admins can manage users/configuration and perform permitted customer corrections.
- Enforce permissions in FastAPI, not just by hiding frontend buttons.
- Hash passwords; never store plaintext passwords.
- Keep secrets in environment variables.

Do not claim the application is production-secure until authentication, authorisation, deployment security, and data protection have been implemented and tested.

# 11. Notification workflow

1. Define which alert/risk events should trigger notifications.
2. Identify recipient and channel.
3. Prepare a concise message with only necessary information.
4. Send through a real provider only when configured.
5. Persist each attempt and provider response.
6. Display `PENDING`, `SENT`, `DELIVERED`, `FAILED`, or `SIMULATED` accurately.
7. Record timestamps/errors.
8. Prevent duplicate sends during retry where possible.

Implement simulated mode first so the project works without provider credentials. Add a real provider only after the provider is selected and credentials are supplied.

# 12. Data quality — limited initial scope

The stakeholder mentioned data quality but did not define a separate module. Initially implement only:
- Required-field validation.
- Type/format validation.
- Duplicate detection where possible.
- Customer existence/foreign-key validation.
- Clear import errors.
- Safe handling of missing historical data.

Do not build a large standalone data-quality dashboard without clarified requirements.

# 13. Build plan

## Phase 1 — Repository audit

Before changing code:
- Inspect the repository, current database, datasets, and AI code.
- Identify what works and what is incomplete.
- Check the existing TimesFM and anomaly detection implementation.
- Identify fields that are actual data versus proposed fields.
- Identify Django-specific code, if any.
- Report what can be reused and what needs changing.

Do not delete existing code, reset the database, or rewrite the project during this audit.

## Phase 2 — Simple backend foundation

- Create FastAPI app.
- Configure SQLite and SQLModel.
- Define the required models.
- Create tables safely.
- Add a health-check endpoint.
- Add a small amount of test data.
- Verify the API works before adding AI logic.

## Phase 3 — Core API

Implement customer, transaction, dashboard, and risk-report routes. Test them using FastAPI's interactive `/docs` page.

## Phase 4 — AI integration

Reuse the working forecasting/anomaly components. Implement and test scoring, grades, and explanations. Ensure ground-truth labels never enter inference.

## Phase 5 — Investigations and notifications

Implement case open/edit/close, notes, audit logs, and simulated notifications. Add a real notification provider only when configured.

## Phase 6 — React frontend

Build the shared layout/navigation, then Dashboard, Customers, Transactions, Investigations, and Notifications. Connect each page to FastAPI through the `frontend/src/api/` functions.

## Phase 7 — Authentication and hardening

Add login/roles before using real sensitive data or deploying beyond a local demonstration. Validate permissions on the backend.

## Phase 8 — Testing and documentation

Test data ingestion, missing customer history, forecast fallback, reproducible risk scores, ground-truth label isolation, dashboard warnings, customer-wise browsing, risk report, case workflow/audit, and notification simulation/failure/retry. Document exact setup and run commands.

# 14. Acceptance criteria

1. Backend starts with FastAPI and does not use Django.
2. SQLite database initialises and persists records.
3. Customer and transaction records can be loaded and queried.
4. Each evaluated transaction gets a risk score, grade, and evidence-based explanation.
5. Ground-truth fraud labels are never used for live scoring.
6. Dashboard warnings show the relevant Customer ID and transaction context.
7. Customer pages show customer-wise transaction history and useful charts.
8. Transactions can be searched/grouped/filtered by Customer ID while individual transactions remain accessible.
9. Every flagged transaction has an accessible risk report.
10. Analysts can open a case, inspect the marked transaction, edit permitted case fields, add notes, and close/resolve it.
11. Customer edits and transaction corrections are validated and audited.
12. Field information icons explain relevant fields accurately.
13. Notification attempts are stored and statuses are truthful.
14. There is no user-facing model-evaluation page.
15. No unrelated charts or features are added.
16. The backend code is understandable: small modules, clear functions, type hints, and no unnecessary architecture.
17. The React frontend communicates with the backend only through the API.

# 15. Instructions for the coding agent

1. Read this specification and inspect the full repository first.
2. Preserve working code, datasets, and database content.
3. Use React + TypeScript for frontend.
4. Use a single FastAPI backend with SQLite + SQLModel for the first working version.
5. Keep backend logic beginner-friendly: clear functions, simple files, minimal abstraction.
6. Do not use Django or Streamlit as the main application frontend.
7. Keep all business logic in the backend; React is an API client.
8. Do not invent fields, endpoints, model outputs, or provider integrations.
9. Never use ground-truth fraud labels for inference or risk scoring.
10. Never present a prediction as confirmed fraud.
11. Never silently overwrite financial transaction history.
12. Do not build a model-evaluation dashboard.
13. Do not add unrelated analytics.
14. Implement in phases and run tests after each phase.
15. Before destructive changes or database resets, explain the impact and ask for approval.
16. At the end of each phase, report files changed, commands run, test results, and remaining work.

**First action: repository audit only.** Report what exists, what can be reused, and what must change. Do not start a full rewrite until the audit is complete.
