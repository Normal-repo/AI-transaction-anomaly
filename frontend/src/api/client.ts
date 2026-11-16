import axios from 'axios';
import {
  DashboardSummary,
  Customer,
  CustomerAnalytics,
  Transaction,
  RiskReport,
  InvestigationCase,
  CaseDetail,
  NotificationItem,
  AuditRecordItem
} from '../types';

const API_BASE = '/api/v1';

export const api = {
  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {
    const res = await axios.get(`${API_BASE}/dashboard/summary`);
    return res.data;
  },

  // Customers
  async getClients(search?: string, limit: number = 50, offset: number = 0): Promise<{ total: number; items: Customer[] }> {
    const params: Record<string, any> = { limit, offset };
    if (search) params.search = search;
    const res = await axios.get(`${API_BASE}/clients`, { params });
    return res.data;
  },

  async getClientDetails(clientId: string): Promise<Customer & { total_transactions: number }> {
    const res = await axios.get(`${API_BASE}/clients/${clientId}`);
    return res.data;
  },

  async updateClient(clientId: string, data: { name?: string; email?: string; phone?: string; reason: string; changed_by: string }): Promise<any> {
    const res = await axios.patch(`${API_BASE}/clients/${clientId}`, data);
    return res.data;
  },

  async getClientTransactions(clientId: string, grade?: string, suspiciousOnly?: boolean): Promise<{ total: number; items: Transaction[] }> {
    const params: Record<string, any> = {};
    if (grade && grade !== 'ALL') params.grade = grade;
    if (suspiciousOnly) params.suspicious_only = true;
    const res = await axios.get(`${API_BASE}/clients/${clientId}/transactions`, { params });
    return res.data;
  },

  async getClientAnalytics(clientId: string): Promise<CustomerAnalytics> {
    const res = await axios.get(`${API_BASE}/clients/${clientId}/analytics`);
    return res.data;
  },

  // Transactions
  async getTransactions(params: {
    client_id?: string;
    grade?: string;
    suspicious_only?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ total: number; items: Transaction[] }> {
    const query: Record<string, any> = {
      limit: params.limit || 50,
      offset: params.offset || 0,
    };
    if (params.client_id) query.client_id = params.client_id;
    if (params.grade && params.grade !== 'ALL') query.grade = params.grade;
    if (params.suspicious_only) query.suspicious_only = true;
    if (params.search) query.search = params.search;

    const res = await axios.get(`${API_BASE}/transactions`, { params: query });
    return res.data;
  },

  async getTransaction(txId: string): Promise<Transaction> {
    const res = await axios.get(`${API_BASE}/transactions/${txId}`);
    return res.data;
  },

  async getRiskReport(txId: string): Promise<RiskReport> {
    const res = await axios.get(`${API_BASE}/transactions/${txId}/risk-report`);
    return res.data;
  },

  async ingestTransaction(data: {
    client_id: string;
    recipient: string;
    location: string;
    payment_method: string;
    amount: number;
  }): Promise<any> {
    const res = await axios.post(`${API_BASE}/transactions`, data);
    return res.data;
  },

  async correctTransaction(txId: string, data: {
    reason: string;
    changed_by: string;
    corrected_amount?: number;
    corrected_recipient?: string;
    corrected_location?: string;
  }): Promise<any> {
    const res = await axios.post(`${API_BASE}/transactions/${txId}/corrections`, data);
    return res.data;
  },

  // Investigations
  async getCases(params?: { status?: string; severity?: string; client_id?: string }): Promise<{ total: number; items: InvestigationCase[] }> {
    const query: Record<string, any> = {};
    if (params?.status && params.status !== 'ALL') query.status_filter = params.status;
    if (params?.severity && params.severity !== 'ALL') query.severity = params.severity;
    if (params?.client_id) query.client_id = params.client_id;

    const res = await axios.get(`${API_BASE}/cases`, { params: query });
    return res.data;
  },

  async getCaseDetails(caseId: string): Promise<CaseDetail> {
    const res = await axios.get(`${API_BASE}/cases/${caseId}`);
    return res.data;
  },

  async updateCase(caseId: string, data: {
    status?: string;
    severity?: string;
    assigned_to?: string;
    resolution_notes?: string;
    changed_by?: string;
  }): Promise<any> {
    const res = await axios.patch(`${API_BASE}/cases/${caseId}`, data);
    return res.data;
  },

  async addCaseNote(caseId: string, data: { note_text: string; author_id: string }): Promise<any> {
    const res = await axios.post(`${API_BASE}/cases/${caseId}/notes`, data);
    return res.data;
  },

  // Notifications
  async getNotifications(clientId?: string): Promise<{ total: number; items: NotificationItem[] }> {
    const params: Record<string, any> = {};
    if (clientId) params.client_id = clientId;
    const res = await axios.get(`${API_BASE}/notifications`, { params });
    return res.data;
  },

  async sendNotification(data: {
    client_id: string;
    recipient: string;
    message: string;
    channel: string;
    tx_id?: string;
    case_id?: string;
  }): Promise<any> {
    const res = await axios.post(`${API_BASE}/notifications/send`, data);
    return res.data;
  },

  async retryNotification(notificationId: string): Promise<any> {
    const res = await axios.post(`${API_BASE}/notifications/${notificationId}/retry`);
    return res.data;
  },

  // Audit Logs
  async getAuditLogs(entityType?: string): Promise<{ total: number; items: AuditRecordItem[] }> {
    const params: Record<string, any> = {};
    if (entityType && entityType !== 'ALL') params.entity_type = entityType;
    const res = await axios.get(`${API_BASE}/audit-logs`, { params });
    return res.data;
  }
};

