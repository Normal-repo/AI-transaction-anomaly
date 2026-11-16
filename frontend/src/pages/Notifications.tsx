import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BellRing,
  Send,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Mail,
  Smartphone,
  ShieldCheck,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { NotificationItem, Customer } from '../types';
import { api } from '../api/client';

export const Notifications: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Compose State - Defaulting to live EMAIL
  const [selectedClient, setSelectedClient] = useState(searchParams.get('client_id') || '');
  const [channel, setChannel] = useState<'EMAIL' | 'SMS'>('EMAIL');
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [txId, setTxId] = useState(searchParams.get('tx_id') || '');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string; id?: string } | null>(null);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      api.getNotifications(),
      api.getClients()
    ])
      .then(([notifs, custs]) => {
        setNotifications(notifs.items);
        setCustomers(custs.items);
        if (selectedClient) {
          const matched = custs.items.find(c => c.client_id === selectedClient);
          if (matched) {
            setRecipient(channel === 'EMAIL' ? (matched.email || '') : (matched.phone || ''));
            setMessage(
              `[SECURITY ALERT - URGENT]\n\nDear ${matched.name},\n\nBankGuard AI Security Monitoring has detected an unusual transaction anomaly on account ${matched.client_id}.\n\nIf this was authorized by you, no action is needed. If you did NOT authorize this transaction, please reply immediately or contact our 24x7 Fraud Desk.\n\nBankGuard AI Security Team`
            );
          }
        }
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCustomerChange = (cid: string) => {
    setSelectedClient(cid);
    const matched = customers.find(c => c.client_id === cid);
    if (matched) {
      setRecipient(channel === 'EMAIL' ? (matched.email || '') : (matched.phone || ''));
      setMessage(
        `[SECURITY ALERT - URGENT]\n\nDear ${matched.name},\n\nBankGuard AI Security Monitoring has detected an unusual transaction anomaly on account ${matched.client_id}.\n\nIf this was authorized by you, no action is needed. If you did NOT authorize this transaction, please reply immediately or contact our 24x7 Fraud Desk.\n\nBankGuard AI Security Team`
      );
    }
  };

  const handleChannelChange = (ch: 'EMAIL' | 'SMS') => {
    setChannel(ch);
    const matched = customers.find(c => c.client_id === selectedClient);
    if (matched) {
      setRecipient(ch === 'EMAIL' ? (matched.email || '') : (matched.phone || ''));
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !recipient || !message) {
      setFeedback({ type: 'error', msg: 'Please complete all required fields (customer, recipient address, and alert message).' });
      return;
    }

    setSending(true);
    setFeedback(null);
    try {
      const res = await api.sendNotification({
        client_id: selectedClient,
        channel,
        recipient,
        message,
        tx_id: txId || undefined
      });

      const isLiveSent = res.status === 'SENT';
      const isFailed = res.status === 'FAILED';

      if (isLiveSent) {
        setFeedback({
          type: 'success',
          msg: `Live email successfully delivered via Gmail SMTP to ${res.recipient}!`,
          id: res.provider_message_id || undefined
        });
      } else if (isFailed) {
        setFeedback({
          type: 'error',
          msg: `Dispatch failed: ${res.error_message || 'Provider rejected message transmission'}`
        });
      } else {
        setFeedback({
          type: 'success',
          msg: `Notification recorded in verification mode (Status: ${res.status}).`
        });
      }
      loadData();
    } catch (err: any) {
      setFeedback({ type: 'error', msg: err.response?.data?.detail || 'Failed to dispatch alert.' });
    } finally {
      setSending(false);
    }
  };

  const handleRetry = async (notificationId: string) => {
    try {
      await api.retryNotification(notificationId);
      loadData();
    } catch (err: any) {
      alert('Retry failed: ' + err.message);
    }
  };

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <Mail className="w-7 h-7 text-emerald-400" />
            Security Alert & Notification Center
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch real-time email security alerts to clients upon anomaly detection.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Gmail SMTP Active: nitinlucky705@gmail.com
        </div>
      </div>

      {/* Channel Status Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              Live Outbound Email Gateway Ready
              <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                LIVE SMTP
              </span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Target recipients receive genuine email alerts directly from your security team inbox.
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setChannel('EMAIL');
              if (customers.length > 0) {
                const c = customers[0];
                setSelectedClient(c.client_id);
                setRecipient(c.email || 'nitinlucky705@gmail.com');
                setMessage(
                  `[SECURITY ALERT - URGENT]\n\nDear ${c.name},\n\nBankGuard AI Security Monitoring has flagged an unusual activity spike on account ${c.client_id}.\n\nPlease review your recent transactions or reply to verify.`
                );
              }
            }}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-lg border border-slate-700 transition-colors"
          >
            Prefill Sample Alert
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Form */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4 h-fit">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-emerald-400" />
            Compose Security Alert
          </h2>

          <form onSubmit={handleSend} className="space-y-4">
            {feedback && (
              <div
                className={`p-3 rounded-lg text-xs flex flex-col gap-1 ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                    : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{feedback.msg}</span>
                </div>
                {feedback.id && (
                  <span className="text-[10px] font-mono text-emerald-500/80 pl-6">
                    Tracking ID: {feedback.id}
                  </span>
                )}
              </div>
            )}

            {/* Channel Selection Toggle */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Dispatch Channel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleChannelChange('EMAIL')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    channel === 'EMAIL'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm'
                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  Email (Live SMTP)
                </button>
                <button
                  type="button"
                  onClick={() => handleChannelChange('SMS')}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border transition-all ${
                    channel === 'SMS'
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  SMS (Part 2)
                </button>
              </div>
              {channel === 'SMS' && (
                <p className="text-[11px] text-amber-400/80 mt-1.5 leading-tight">
                  SMS gateway integration deferred to Part 2. Please use Email for live outbound delivery.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Target Customer</label>
              <select
                value={selectedClient}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">-- Select Customer Account --</option>
                {customers.map((c) => (
                  <option key={c.client_id} value={c.client_id}>
                    {c.client_id} — {c.name} ({c.email || 'No email'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Recipient {channel === 'EMAIL' ? 'Email Address' : 'Phone Number'}
              </label>
              <input
                type={channel === 'EMAIL' ? 'email' : 'text'}
                placeholder={channel === 'EMAIL' ? 'customer@example.com' : '+91 98765 43210'}
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Related Transaction (Optional)</label>
              <input
                type="text"
                placeholder="e.g. TXN-1001-01"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Alert Message</label>
              <textarea
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter alert text..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500 leading-relaxed"
                required
              />
            </div>

            <button
              type="submit"
              disabled={sending}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 transition-colors disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sending ? 'Transmitting via SMTP...' : channel === 'EMAIL' ? 'Dispatch Live Email Alert' : 'Dispatch Alert'}
            </button>
          </form>
        </div>

        {/* History Table */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl space-y-3">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Outbound Email & Alert Audit Log
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Notification ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">Recipient</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dispatched At</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Loading dispatch ledger...
                    </td>
                  </tr>
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      No notifications recorded yet.
                    </td>
                  </tr>
                ) : (
                  notifications.map((n) => (
                    <tr key={n.notification_id} className="hover:bg-slate-850/50">
                      <td className="py-3 px-4 font-mono font-semibold text-white">
                        {n.notification_id}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {n.client_id}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono flex items-center gap-1 w-fit">
                          {n.channel === 'EMAIL' ? (
                            <Mail className="w-2.5 h-2.5 text-emerald-400" />
                          ) : (
                            <Smartphone className="w-2.5 h-2.5 text-amber-400" />
                          )}
                          {n.channel}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 truncate max-w-[180px]">
                        {n.recipient}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold w-fit ${
                              n.status === 'SENT' || n.status === 'DELIVERED'
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : n.status === 'SIMULATED'
                                ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {n.status === 'SENT' && <CheckCircle className="w-2.5 h-2.5" />}
                            {n.status}
                          </span>
                          {n.provider_message_id && n.status === 'SENT' && (
                            <span className="text-[10px] text-slate-500 font-mono">
                              {n.provider_message_id}
                            </span>
                          )}
                          {n.error_message && (
                            <span className="text-[10px] text-rose-400 max-w-[180px] truncate" title={n.error_message}>
                              {n.error_message}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(n.attempted_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleRetry(n.notification_id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                        >
                          Resend
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
