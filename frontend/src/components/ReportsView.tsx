import React, { useEffect, useState } from 'react';
import api from '../api';
import { OverdueReportItem } from '../types';
import { AlertOctagon, TrendingUp, Check, ShieldCheck, FileText } from 'lucide-react';

export const ReportsView: React.FC = () => {
  const [circulation, setCirculation] = useState<any>(null);
  const [overdue, setOverdue] = useState<OverdueReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [fineActionMsg, setFineActionMsg] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const [circRes, overRes] = await Promise.all([
        api.get('/loans/reports/circulation'),
        api.get('/loans/reports/overdue'),
      ]);
      setCirculation(circRes.data);
      setOverdue(overRes.data);
    } catch (err) {
      console.error('Failed to load reports', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleCollectFine = async (loanId: number) => {
    setFineActionMsg(null);
    try {
      const res = await api.post(`/loans/${loanId}/pay-fine`);
      setFineActionMsg(res.data.message);
      fetchReports();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to settle fine');
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-[#86868b] text-xs animate-pulse">Aggregating telemetry & circulation indexes…</div>;
  }

  const s = circulation?.summary || {};
  const recentAudits = circulation?.recentAudits || [];

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Circulation Analytics
        </h1>
        <p className="text-sm text-[#86868b] mt-1">
          Real-time aggregates of catalog inventory, active checkout volumes, and delinquent accounts.
        </p>
      </div>

      {fineActionMsg && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4" /> {fineActionMsg}
          </span>
          <button onClick={() => setFineActionMsg(null)} className="text-white/70 hover:text-white cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="apple-card p-6">
          <span className="text-[11px] font-semibold text-[#86868b] uppercase tracking-wider">Catalog Titles</span>
          <div className="text-3xl font-extrabold text-white mt-3">{s.total_titles || 0}</div>
          <span className="text-xs text-[#86868b] mt-1 block">{s.total_copies || 0} physical copies</span>
        </div>

        <div className="apple-card p-6">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Available Shelf</span>
          <div className="text-3xl font-extrabold text-emerald-400 mt-3">{s.available_copies || 0}</div>
          <span className="text-xs text-[#86868b] mt-1 block">Ready for checkout</span>
        </div>

        <div className="apple-card p-6">
          <span className="text-[11px] font-semibold text-[#2997ff] uppercase tracking-wider">On Loan</span>
          <div className="text-3xl font-extrabold text-[#2997ff] mt-3">{s.active_loans_count || 0}</div>
          <span className="text-xs text-[#86868b] mt-1 block">{s.on_hold_copies || 0} on hold</span>
        </div>

        <div className="apple-card p-6">
          <span className="text-[11px] font-semibold text-red-400 uppercase tracking-wider">Overdue</span>
          <div className="text-3xl font-extrabold text-red-400 mt-3">{s.overdue_loans_count || 0}</div>
          <span className="text-xs text-[#86868b] mt-1 block">Staff attention needed</span>
        </div>
      </div>

      {/* Overdue Delinquency Report */}
      <div className="apple-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <h2 className="text-lg font-bold text-white">Overdue Delinquency Log ({overdue.length})</h2>
          </div>
          <span className="text-xs text-[#86868b]">$1.00 per day fine policy</span>
        </div>

        {overdue.length === 0 ? (
          <p className="text-xs text-[#86868b] py-8 text-center">Zero overdue loans. Perfect return record!</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Title & Barcode</th>
                  <th className="py-3 px-4">Borrower Details</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Days Overdue</th>
                  <th className="py-3 px-4">Fine Amount</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {overdue.map((item) => (
                  <tr key={item.loan_id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{item.book_title}</div>
                      <div className="font-mono text-xs text-[#86868b]">{item.barcode}</div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-white/90">{item.member_name}</div>
                      <div className="text-xs text-[#86868b]">
                        {item.member_number} • {item.member_email}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-xs text-[#86868b]">
                      {new Date(item.due_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25 text-xs font-bold">
                        {item.days_overdue} days
                      </span>
                    </td>
                    <td className="py-4 px-4 font-mono font-bold text-red-400">
                      ${(item.days_overdue * 1.0).toFixed(2)}
                      {item.fine_paid === 1 && <span className="ml-2 text-xs text-emerald-400 font-sans font-normal">(Paid)</span>}
                    </td>
                    <td className="py-4 px-4">
                      {item.fine_paid === 0 && (
                        <button
                          onClick={() => handleCollectFine(item.loan_id)}
                          className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold border border-emerald-500/20 transition cursor-pointer"
                        >
                          Collect Fine
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

      {/* Immutable Audit Log */}
      {recentAudits.length > 0 && (
        <div className="apple-card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <FileText className="w-5 h-5 text-[#2997ff]" />
            <h2 className="text-lg font-bold text-white">Immutable Circulation Audit Trail</h2>
          </div>
          <div className="space-y-2.5 font-mono text-xs text-[#86868b]">
            {recentAudits.map((a: any) => (
              <div key={a.id} className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[#2997ff] font-bold">[{a.action}]</span> {a.details}
                </div>
                <div className="text-[10px] text-white/40">
                  {new Date(a.created_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Circulation Leaderboard */}
      {circulation?.topCirculatedBooks && (
        <div className="apple-card p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <TrendingUp className="w-5 h-5 text-[#2997ff]" />
            <h2 className="text-lg font-bold text-white">Most Borrowed Titles</h2>
          </div>
          <div className="space-y-3">
            {circulation.topCirculatedBooks.map((b: any, idx: number) => (
              <div key={b.id} className="flex items-center justify-between p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <span className="w-7 h-7 rounded-full bg-[#0071e3]/20 text-[#2997ff] font-bold text-xs flex items-center justify-center">
                    #{idx + 1}
                  </span>
                  <div>
                    <h4 className="font-semibold text-white text-sm">{b.title}</h4>
                    <span className="text-xs text-[#86868b] font-mono">ISBN {b.isbn}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-sm">{b.total_checkouts}</span>
                  <span className="text-xs text-[#86868b] block">checkouts</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
