import React, { useEffect, useState } from 'react';
import api from '../api';
import { Loan, Hold } from '../types';
import { Clock, Bookmark, AlertTriangle, Check, RotateCw } from 'lucide-react';

export const MemberDashboard: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

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

  const handleRenewLoan = async (loanId: number) => {
    setMessage(null);
    try {
      const res = await api.post(`/loans/${loanId}/renew`);
      setMessage({ text: `${res.data.message} New Due Date: ${new Date(res.data.newDueDate).toLocaleDateString()}`, type: 'success' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.response?.data?.error || 'Renewal failed', type: 'error' });
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
                      {loan.is_overdue === 0 && (loan.renewal_count || 0) < 2 ? (
                        <button
                          onClick={() => handleRenewLoan(loan.id)}
                          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-medium inline-flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <RotateCw className="w-3 h-3" /> Renew (+7d)
                        </button>
                      ) : (
                        <span className="text-xs text-[#86868b] italic">
                          {loan.is_overdue === 1 ? 'Overdue' : 'Max renewals'}
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
