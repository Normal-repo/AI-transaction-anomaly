export interface DashboardWarning {
  tx_id: string;
  client_id: string;
  client_name: string;
  timestamp: string;
  amount: number;
  risk_score: number;
  risk_grade: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  case_id?: string | null;
  case_status?: string | null;
}

export interface DashboardSummary {
  total_customers: number;
  transactions_processed: number;
  suspicious_transactions: number;
  high_critical_alerts: number;
  open_investigations: number;
  recent_warnings: DashboardWarning[];
}

export interface Customer {
  client_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  avg_daily_spend: number;
  std_daily_spend: number;
  avg_daily_tx_count: number;
  suspicious_tx_count?: number;
  has_active_warning?: boolean;
  typical_locations: string[];
  trusted_recipients: string[];
  typical_payment_methods: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyHistoryItem {
  date: string;
  spend: number;
  count: number;
}

export interface ForecastItem {
  date: string;
  predicted_spend: number;
}

export interface CustomerAnalytics {
  client_id: string;
  history: DailyHistoryItem[];
  forecast: ForecastItem[];
  forecast_meta: {
    model_name: string;
    fallback_used: boolean;
    mean_forecast: number;
    horizon_days: number;
  };
}

export interface Transaction {
  tx_id: string;
  client_id: string;
  client_name?: string;
  timestamp: string;
  recipient: string;
  location: string;
  payment_method: string;
  amount: number;
  daily_tx_count: number;
  daily_tx_total: number;
  predicted_daily_spend?: number | null;
  anomaly_score: number;
  risk_score: number;
  risk_grade: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
  is_suspicious: boolean;
  reasons: string[];
  case_id?: string | null;
  case_status?: string | null;
}

export interface RiskSignalItem {
  name: string;
  score: number;
  weight: number;
  description: string;
}

export interface RiskReport {
  tx_id: string;
  client_id: string;
  timestamp: string;
  amount: number;
  risk_score: number;
  risk_grade: 'NORMAL' | 'LOW' | 'HIGH' | 'CRITICAL';
  is_suspicious: boolean;
  reasons: string[];
  signals: RiskSignalItem[];
  component_scores: {
    amount_score: number;
    frequency_score: number;
    location_score: number;
    recipient_score: number;
    payment_method_score: number;
    anomaly_score: number;
    final_risk_score: number;
  };
  baseline_comparison: {
    avg_daily_spend: number;
    std_daily_spend: number;
    avg_daily_tx_count: number;
    typical_locations: string[];
    trusted_recipients: string[];
    typical_payment_methods: string[];
  };
  forecast_context: {
    predicted_daily_spend?: number | null;
    actual_daily_total: number;
    deviation: number;
  };
  disclaimer: string;
}

export interface CaseNote {
  note_id: number;
  author_id: string;
  note_text: string;
  created_at: string;
}

export interface InvestigationCase {
  case_id: string;
  client_id: string;
  client_name: string;
  tx_id: string;
  amount: number;
  risk_score: number;
  risk_grade: string;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_to?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface CaseDetail {
  case_id: string;
  client_id: string;
  client_name: string;
  client_email?: string | null;
  client_phone?: string | null;
  status: 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'FALSE_POSITIVE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assigned_to?: string | null;
  resolution_notes?: string | null;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  transaction?: {
    tx_id: string;
    timestamp: string;
    amount: number;
    recipient: string;
    location: string;
    payment_method: string;
    risk_score: number;
    risk_grade: string;
    reasons: string[];
  };
  notes: CaseNote[];
  audit_trail: {
    audit_id: number;
    action: string;
    changed_by: string;
    changed_at: string;
    reason?: string;
  }[];
}

export interface NotificationItem {
  notification_id: string;
  client_id: string;
  case_id?: string | null;
  tx_id?: string | null;
  channel: string;
  recipient: string;
  message: string;
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED' | 'SIMULATED';
  provider_message_id?: string | null;
  error_message?: string | null;
  attempted_at: string;
  created_at: string;
}

export interface AuditRecordItem {
  audit_id: number;
  entity_type: string;
  entity_id: string;
  action: string;
  old_value?: string | null;
  new_value?: string | null;
  changed_by: string;
  changed_at: string;
  reason?: string | null;
}
