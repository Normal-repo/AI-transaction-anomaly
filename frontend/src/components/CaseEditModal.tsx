import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, CheckCircle, Clock, AlertCircle, MessageSquarePlus } from 'lucide-react';
import { CaseDetail } from '../types';
import { api } from '../api/client';
import { RiskGradeBadge } from './RiskGradeBadge';

interface Props {
  caseId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CaseEditModal: React.FC<Props> = ({ caseId, onClose, onSuccess }) => {
  const [caseData, setCaseData] = useState<CaseDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [status, setStatus] = useState<string>('OPEN');
  const [severity, setSeverity] = useState<string>('MEDIUM');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [newNote, setNewNote] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    setLoading(true);
    api.getCaseDetails(caseId)
      .then(data => {
        setCaseData(data);
        setStatus(data.status);
        setSeverity(data.severity);
        setResolutionNotes(data.resolution_notes || '');
      })
      .catch(err => setError(err.response?.data?.detail || 'Failed to load case.'))
      .finally(() => setLoading(false));
  }, [caseId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!caseId) return null;

  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.updateCase(caseId, {
        status,
        severity,
        resolution_notes: resolutionNotes,
        changed_by: 'Senior Analyst'
      });
      if (newNote.trim()) {
        await api.addCaseNote(caseId, {
          note_text: newNote,
          author_id: 'Senior Analyst'
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update case.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-semibold text-white">Investigation Case Review: {caseId}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400">Loading case details...</div>
        ) : (
          <form onSubmit={handleUpdateCase} className="p-5 space-y-5 flex-1">
            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {caseData?.transaction && (
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Customer: <strong className="text-white">{caseData.client_name}</strong> ({caseData.client_id})</span>
                  <RiskGradeBadge grade={caseData.transaction.risk_grade} size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500">Transaction Amount:</span>
                    <div className="font-semibold text-emerald-400">₹{caseData.transaction.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Recipient:</span>
                    <div className="font-semibold text-white truncate">{caseData.transaction.recipient}</div>
                  </div>
                  <div>
                    <span className="text-slate-500">Risk Score:</span>
                    <div className="font-semibold text-white">{caseData.transaction.risk_score} / 100</div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Case Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="OPEN">OPEN (Under Active Triage)</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW (Contacting Customer)</option>
                  <option value="RESOLVED">RESOLVED (Action Taken)</option>
                  <option value="FALSE_POSITIVE">FALSE_POSITIVE (Legitimate Activity)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Severity Tier</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Resolution / Analyst Summary</label>
              <textarea
                rows={2}
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Findings summary or closure reason..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Existing Notes Timeline */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">Case Investigation Notes</label>
              <div className="max-h-40 overflow-y-auto space-y-2 p-2 bg-slate-950/60 border border-slate-800 rounded-lg">
                {caseData?.notes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-2">No notes recorded yet.</p>
                ) : (
                  caseData?.notes.map((note) => (
                    <div key={note.note_id} className="p-2.5 bg-slate-900 border border-slate-800 rounded text-xs space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-emerald-400">{note.author_id}</span>
                        <span>{new Date(note.created_at).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-300">{note.note_text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                <MessageSquarePlus className="w-3.5 h-3.5 text-emerald-400" />
                Add New Analyst Note
              </label>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Log internal update, telephone callback result, or card status..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving ? 'Updating...' : 'Save Case Updates'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

