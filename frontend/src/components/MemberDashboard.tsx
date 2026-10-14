import React, { useEffect, useState } from 'react';
import api from '../api';
import { Loan, Hold } from '../types';
import { Clock, Bookmark, AlertTriangle, Check, RotateCw, FileText, X, Send } from 'lucide-react';

export const MemberDashboard: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Extension Application Modal state
  const [selectedLoanForExt, setSelectedLoanForExt] = useState<Loan | null>(null);
  const [requestedDays, setRequestedDays] = useState(7);
  const [extensionReason, setExtensionReason] = useState('Preparing for final semester examinations and project report completion.');
  const [submittingExtension, setSubmittingExtension] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const loansRes = await api.get('/loans/my-loans');
      const holdsData = await api.get('/holds/my-holds');
      setLoans(loansRes.data);
      setHolds(holdsData.data);
    } catch (err) {
      console.error('Failed to load member records', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForExt) return;
    setMessage(null);
    setSubmittingExtension(true);

    try {
      const res = await api.post(`/loans/${selectedLoanForExt.id}/apply-extension`, {
        requestedDays: Number(requestedDays),
        reason: extensionReason.trim(),
      });

      setMessage({
        text: `✓ ${res.data.message || 'Loan extension application submitted to Librarian Desk.'}`,
        type: 'success',
      });

      // Update state locally
      setLoans((prev) =>
        prev.map((l) =>
          l.id === selectedLoanForExt.id
            ? {
                ...l,
                pending_extension_id: 999,
                pending_extension_days: Number(requestedDays),
                pending_extension_reason: extensionReason.trim(),
              }
            : l
        )
      );

      setSelectedLoanForExt(null);
      loadData();
    } catch (err: any) {
      setMessage({
        text: err.response?.data?.error || 'Failed to submit extension application',
        type: 'error',
      });
    } finally {
      setSubmittingExtension(false);
    }
  };

  const handleCancelHold = async (holdId: number) => {
    setMessage(null);
    try {
      await api.delete(`/holds/${holdId}`);
      setMessage({ text: 'Hold successfully cancelled and queue updated.', type: 'success' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Failed to cancel hold', type: 'error' });
    }
  };

  const activeLoans = loans.filter((l) => !l.returned_at);
  const pastLoans = loans.filter((l) => !!l.returned_at);

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          My Borrowing & Holds
        </h1>
        <p className="text-sm text-[#86868b] mt-1">
          Review active checkouts, self-service +7 day loan renewal, overdue alerts, and queue position.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 border rounded-2xl text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
              : 'bg-red-500/10 border-red-500/20 text-red-300'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage(null)} className="font-semibold text-white/70 hover:text-white cursor-pointer ml-4">
            Dismiss
          </button>
        </div>
      )}

      {/* Active Loans Card */}
      <div className="apple-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#2997ff]" />
            <h2 className="text-lg font-bold text-white">Active Loans ({activeLoans.length})</h2>
          </div>
          <span className="text-xs text-[#86868b]">Self-service renewal allowed if queue is clear</span>
        </div>

        {activeLoans.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#86868b]">No books currently checked out.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Barcode</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Renewals</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {activeLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-4 font-semibold text-white">{loan.book_title}</td>
                    <td className="py-4 px-4 font-mono text-xs text-[#86868b]">{loan.barcode}</td>
                    <td className="py-4 px-4 text-xs font-medium text-white/90">
                      {new Date(loan.due_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      {loan.is_overdue === 1 ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-bold inline-flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> Overdue ($1/day fine)
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium inline-flex items-center gap-1.5">
                          <Check className="w-3 h-3" /> Active
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#86868b]">
                      {loan.renewal_count || 0} / 2 used
                    </td>
                    <td className="py-4 px-4">
                      {loan.pending_extension_id ? (
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold inline-flex items-center gap-1.5">
                          <FileText className="w-3 h-3" /> Under Librarian Review
                        </span>
                      ) : loan.is_overdue === 0 && (loan.renewal_count || 0) < 2 ? (
                        <button
                          onClick={() => {
                            setSelectedLoanForExt(loan);
                            setRequestedDays(7);
                            setExtensionReason('Academic coursework and final assignment preparation.');
                          }}
                          className="px-3.5 py-1.5 bg-[#0071e3]/20 hover:bg-[#0071e3]/30 text-[#2997ff] border border-blue-500/30 rounded-full text-xs font-semibold inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <FileText className="w-3 h-3" /> Apply for Extension
                        </button>
                      ) : (
                        <span className="text-xs text-[#86868b] italic">
                          {loan.is_overdue === 1 ? 'Overdue' : 'Max renewals reached'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Extension Application Modal */}
      {selectedLoanForExt && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="relative bg-[#1d1d1f] rounded-[24px] shadow-2xl max-w-lg w-full border border-white/10 overflow-hidden my-8 text-white p-8">
            <button
              onClick={() => setSelectedLoanForExt(null)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5 mb-6">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-xl tracking-tight">Loan Extension Application</h2>
                <p className="text-xs text-[#86868b]">Apply for an approved due date extension from the librarian</p>
              </div>
            </div>

            <form onSubmit={handleSubmitExtension} className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-xs space-y-1">
                <div className="text-[#86868b]">Selected Book:</div>
                <div className="font-bold text-white text-sm">{selectedLoanForExt.book_title}</div>
                <div className="text-[11px] text-[#86868b] font-mono">
                  Barcode: {selectedLoanForExt.barcode} • Current Due Date: {new Date(selectedLoanForExt.due_at).toLocaleDateString()}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">
                  Requested Extension Window
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[7, 14, 21].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setRequestedDays(d)}
                      className={`py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        requestedDays === d
                          ? 'bg-[#0071e3] text-white border-blue-400'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      +{d} Days
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2">
                  Academic Justification / Reason
                </label>
                <textarea
                  rows={3}
                  required
                  value={extensionReason}
                  onChange={(e) => setExtensionReason(e.target.value)}
                  placeholder="Detail your academic research, project deadlines, or syllabus requirements…"
                  className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setSelectedLoanForExt(null)}
                  className="px-5 py-2.5 text-xs font-semibold text-[#86868b] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingExtension}
                  className="apple-pill-btn px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingExtension ? 'Submitting…' : 'Submit Application to Librarian'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Holds & Reservations Queue */}
      <div className="apple-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-[#9d4edd]" />
            <h2 className="text-lg font-bold text-white">Holds & Reservations ({holds.length})</h2>
          </div>
          <span className="text-xs text-[#86868b]">Auto-promoted on copy return</span>
        </div>

        {holds.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#86868b]">No reservations currently placed.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Reservation Status</th>
                  <th className="py-3 px-4">Placed Date</th>
                  <th className="py-3 px-4">Pickup Window</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {holds.map((hold) => (
                  <tr key={hold.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-4 font-semibold text-white">{hold.book_title}</td>
                    <td className="py-4 px-4">
                      {hold.status === 'ready_for_pickup' && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                          Ready for Pickup at Desk!
                        </span>
                      )}
                      {hold.status === 'waiting' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium">
                          Waiting in Queue
                        </span>
                      )}
                      {hold.status === 'fulfilled' && (
                        <span className="px-2.5 py-1 rounded-full bg-white/5 text-[#86868b] text-xs">
                          Fulfilled
                        </span>
                      )}
                      {hold.status === 'cancelled' && (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">
                          Cancelled
                        </span>
                      )}
                      {hold.status === 'expired' && (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                          Expired
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#86868b]">
                      {new Date(hold.placed_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#86868b]">
                      {hold.expires_at ? new Date(hold.expires_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-4 px-4">
                      {(hold.status === 'waiting' || hold.status === 'ready_for_pickup') && (
                        <button
                          onClick={() => handleCancelHold(hold.id)}
                          className="text-xs text-red-400 hover:text-red-300 font-semibold cursor-pointer transition"
                        >
                          Cancel Hold
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* History */}
      {pastLoans.length > 0 && (
        <div className="apple-card p-8">
          <h2 className="text-base font-bold text-white/70 mb-4">Past Borrowing History ({pastLoans.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[10px] uppercase text-[#86868b] border-b border-white/5">
                <tr>
                  <th className="py-2.5 px-4">Book</th>
                  <th className="py-2.5 px-4">Checked Out</th>
                  <th className="py-2.5 px-4">Returned Date</th>
                  <th className="py-2.5 px-4">Fine Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-[#86868b]">
                {pastLoans.map((l) => (
                  <tr key={l.id}>
                    <td className="py-3 px-4 text-white/90 font-medium">{l.book_title}</td>
                    <td className="py-3 px-4">{new Date(l.checked_out_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">{new Date(l.returned_at!).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono">
                      {l.fine_amount > 0 ? (
                        <span className={l.fine_paid === 1 ? 'text-emerald-400' : 'text-red-400'}>
                          ${l.fine_amount.toFixed(2)} {l.fine_paid === 1 ? '(Paid)' : '(Unpaid)'}
                        </span>
                      ) : '$0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
