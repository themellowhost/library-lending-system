import React, { useState } from 'react';
import api from '../api';
import { LogOut, BookDown, Check, AlertOctagon, Barcode, UserCheck, ArrowRight } from 'lucide-react';

export const CirculationDesk: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'checkout' | 'return'>('checkout');

  // Checkout form state
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [checkoutBarcode, setCheckoutBarcode] = useState('');
  const [loanDays, setLoanDays] = useState(14);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<any>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Return form state
  const [returnBarcode, setReturnBarcode] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnResult, setReturnResult] = useState<any>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);
    setCheckoutResult(null);
    setCheckoutLoading(true);

    try {
      const payload: any = {
        copyBarcode: checkoutBarcode.trim(),
        loanDays: Number(loanDays),
      };

      if (/^\d+$/.test(memberIdentifier.trim())) {
        payload.memberId = Number(memberIdentifier.trim());
      } else {
        payload.memberNumber = memberIdentifier.trim();
      }

      const res = await api.post('/loans/checkout', payload);
      setCheckoutResult(res.data);
      setCheckoutBarcode('');
    } catch (err: any) {
      setCheckoutError(err.response?.data?.error || 'Failed to complete checkout');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnError(null);
    setReturnResult(null);
    setReturnLoading(true);

    try {
      const res = await api.post('/loans/return', {
        copyBarcode: returnBarcode.trim(),
      });
      setReturnResult(res.data);
      setReturnBarcode('');
    } catch (err: any) {
      setReturnError(err.response?.data?.error || 'Failed to process return');
    } finally {
      setReturnLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto">
      {/* Segmented Control Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
          Circulation Desk
        </h1>
        <p className="text-sm text-[#86868b] max-w-lg mx-auto">
          Execute atomic database transactions for checkout and returns with instant concurrency safeguards.
        </p>

        <div className="inline-flex p-1 rounded-full bg-[#1c1c1e] border border-white/10 mt-4">
          <button
            onClick={() => {
              setActiveTab('checkout');
              setCheckoutError(null);
              setCheckoutResult(null);
              setReturnError(null);
              setReturnResult(null);
            }}
            className={`px-6 py-2 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'checkout'
                ? 'bg-[#0071e3] text-white shadow-md'
                : 'text-[#86868b] hover:text-white'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 rotate-180" /> Checkout Item
          </button>
          <button
            onClick={() => {
              setActiveTab('return');
              setCheckoutError(null);
              setCheckoutResult(null);
              setReturnError(null);
              setReturnResult(null);
            }}
            className={`px-6 py-2 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'return'
                ? 'bg-[#0071e3] text-white shadow-md'
                : 'text-[#86868b] hover:text-white'
            }`}
          >
            <BookDown className="w-3.5 h-3.5" /> Return Item
          </button>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="apple-card p-8 sm:p-12">
        {activeTab === 'checkout' && (
          <form onSubmit={handleCheckout} className="space-y-6 max-w-xl mx-auto">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 ml-1">
                Member Identifier (ID or Member Number)
              </label>
              <div className="relative">
                <UserCheck className="w-4 h-4 text-[#86868b] absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  value={memberIdentifier}
                  onChange={(e) => setMemberIdentifier(e.target.value)}
                  placeholder="e.g. MEM-00101"
                  className="w-full pl-11 pr-4 py-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
                />
              </div>
              <p className="text-[11px] text-[#86868b] mt-1.5 ml-1">
                Demo accounts: <span className="text-white/80 font-mono">MEM-00101</span> (Alex) or{' '}
                <span className="text-white/80 font-mono">MEM-00102</span> (Priya).
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 ml-1">
                Physical Copy Barcode
              </label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-[#86868b] absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  value={checkoutBarcode}
                  onChange={(e) => setCheckoutBarcode(e.target.value)}
                  placeholder="Scan barcode (e.g. BC-DBS-001)"
                  className="w-full pl-11 pr-4 py-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] font-mono"
                />
              </div>
              <div className="flex gap-2 mt-1.5 ml-1 text-[11px] text-[#86868b]">
                <span>Quick scan:</span>
                <button
                  type="button"
                  onClick={() => setCheckoutBarcode('BC-DBS-001')}
                  className="font-mono text-[#2997ff] hover:underline cursor-pointer"
                >
                  BC-DBS-001
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutBarcode('BC-DDIA-001')}
                  className="font-mono text-[#2997ff] hover:underline cursor-pointer"
                >
                  BC-DDIA-001
                </button>
                <button
                  type="button"
                  onClick={() => setCheckoutBarcode('BC-ARCH-001')}
                  className="font-mono text-[#2997ff] hover:underline cursor-pointer"
                >
                  BC-ARCH-001
                </button>
              </div>
            </div>

            <div className="w-40">
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 ml-1">
                Loan Window (Days)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={loanDays}
                onChange={(e) => setLoanDays(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <button
              type="submit"
              disabled={checkoutLoading}
              className="w-full py-3.5 apple-pill-btn text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <span>{checkoutLoading ? 'Executing Transaction…' : 'Process Checkout'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {activeTab === 'return' && (
          <form onSubmit={handleReturn} className="space-y-6 max-w-xl mx-auto">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-2 ml-1">
                Barcode to Return
              </label>
              <div className="relative">
                <Barcode className="w-4 h-4 text-[#86868b] absolute left-4 top-3.5" />
                <input
                  type="text"
                  required
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  placeholder="Scan copy barcode (e.g. BC-DBS-003, BC-CLRS-002)"
                  className="w-full pl-11 pr-4 py-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] font-mono"
                />
              </div>
              <p className="text-[11px] text-[#86868b] mt-1.5 ml-1">
                Demo items currently on loan: <span className="text-white/80 font-mono">BC-DBS-003</span> or{' '}
                <span className="text-white/80 font-mono">BC-CLRS-002</span> (overdue).
              </p>
            </div>

            <button
              type="submit"
              disabled={returnLoading}
              className="w-full py-3.5 apple-pill-btn text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              <span>{returnLoading ? 'Processing Return…' : 'Check In & Close Loan'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Error Feedback Card */}
        {(checkoutError || returnError) && (
          <div className="mt-8 p-5 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-sm text-red-400 max-w-xl mx-auto">
            <AlertOctagon className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-300">Transaction Aborted</h4>
              <p className="text-xs mt-1 text-red-400/90">{checkoutError || returnError}</p>
            </div>
          </div>
        )}

        {/* Success Feedback Card */}
        {checkoutResult && (
          <div className="mt-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 max-w-xl mx-auto text-emerald-300">
            <div className="flex items-center gap-2 font-bold text-sm mb-3">
              <Check className="w-4 h-4 text-emerald-400" />
              {checkoutResult.message}
            </div>
            <div className="text-xs space-y-1.5 text-emerald-400/90 font-mono">
              <p>Title: <span className="text-white font-sans font-semibold">{checkoutResult.loan.bookTitle}</span></p>
              <p>Barcode: {checkoutResult.loan.copyBarcode}</p>
              <p>Borrower: {checkoutResult.loan.memberName} ({checkoutResult.loan.memberNumber})</p>
              <p>Due Date: {new Date(checkoutResult.loan.dueAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {returnResult && (
          <div className="mt-8 p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 max-w-xl mx-auto text-emerald-300 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm">
              <Check className="w-4 h-4 text-emerald-400" />
              {returnResult.message}
            </div>
            <div className="text-xs space-y-1 text-emerald-400/90 font-mono">
              <p>Title: <span className="text-white font-sans font-semibold">{returnResult.details.bookTitle}</span></p>
              <p>Copy Status Now: <span className="capitalize text-white">{returnResult.details.copyStatus}</span></p>
            </div>

            {returnResult.details.isOverdue ? (
              <div className="p-3 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-300 text-xs">
                ⚠️ Overdue fine assessed: ${returnResult.details.fineAmount.toFixed(2)}
              </div>
            ) : (
              <div className="text-xs text-emerald-400">Returned on schedule without late penalties.</div>
            )}

            {returnResult.details.nextHoldAssigned && (
              <div className="p-3 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-300 text-xs">
                📌 Hold Queue Triggered: Assigned to {returnResult.details.nextHoldAssigned.memberName} (3-day pickup window).
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
