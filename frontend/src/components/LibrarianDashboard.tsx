import React, { useEffect, useState } from 'react';
import api from '../api';
import { Book } from '../types';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowRightLeft,
  Users,
  AlertTriangle,
  Plus,
  Search,
  Barcode,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface LibrarianDashboardProps {
  onOpenAddBook: () => void;
  onGoToCirculation: () => void;
  onSelectBook: (bookId: number) => void;
}

export const LibrarianDashboard: React.FC<LibrarianDashboardProps> = ({
  onOpenAddBook,
  onGoToCirculation,
  onSelectBook,
}) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'on_loan' | 'available'>('all');
  const [search, setSearch] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [booksRes, circRes] = await Promise.all([
        api.get('/books'),
        api.get('/loans/reports/circulation').catch(() => null),
      ]);
      setBooks(booksRes.data || []);
      if (circRes && circRes.data?.summary) {
        setSummary(circRes.data.summary);
      }
    } catch (err) {
      console.error('Failed to load librarian dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute metrics from books if summary is not available
  const totalTitles = books.length;
  const totalCopies = books.reduce((acc, b) => acc + (b.total_copies || 0), 0);
  const availableCopies = books.reduce((acc, b) => acc + (b.available_copies || 0), 0);
  const onLoanCopies = books.reduce((acc, b) => acc + (b.on_loan_copies || 0), 0);

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.authors.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'on_loan') return b.on_loan_copies > 0;
    if (filter === 'available') return b.available_copies > 0;
    return true;
  });

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-8 rounded-3xl apple-card relative overflow-hidden border border-white/10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#2997ff] text-xs font-semibold">
            <Layers className="w-3.5 h-3.5" /> Librarian Control Desk
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Inventory & Circulation Monitor
          </h1>
          <p className="text-xs sm:text-sm text-[#86868b] max-w-xl">
            Track real-time shelf presence, manage physical item barcodes, and dispatch loan checkout transactions.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAddBook}
            className="apple-pill-btn px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add Title
          </button>
          <button
            onClick={onGoToCirculation}
            className="apple-secondary-btn px-5 py-2.5 text-xs font-semibold flex items-center gap-2 cursor-pointer"
          >
            <Barcode className="w-3.5 h-3.5" /> Scan Barcodes
          </button>
        </div>
      </div>

      {/* KPI Metric Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-6 rounded-2xl apple-card">
          <div className="flex items-center justify-between text-[#86868b] mb-2">
            <span className="text-xs font-medium">Total Titles</span>
            <BookOpen className="w-4 h-4 text-white/70" />
          </div>
          <div className="text-3xl font-black text-white">{totalTitles}</div>
          <p className="text-[11px] text-[#86868b] mt-1">Cataloged in database</p>
        </div>

        <div className="p-6 rounded-2xl apple-card">
          <div className="flex items-center justify-between text-[#86868b] mb-2">
            <span className="text-xs font-medium">Physical Copies</span>
            <Layers className="w-4 h-4 text-white/70" />
          </div>
          <div className="text-3xl font-black text-white">{totalCopies}</div>
          <p className="text-[11px] text-[#86868b] mt-1">Total barcodes in circulation</p>
        </div>

        <div className="p-6 rounded-2xl apple-card border border-emerald-500/20 bg-emerald-500/[0.03]">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium">On Shelf (Available)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-emerald-400">{availableCopies}</div>
          <p className="text-[11px] text-[#86868b] mt-1">Ready for checkout</p>
        </div>

        <div className="p-6 rounded-2xl apple-card border border-amber-500/20 bg-amber-500/[0.03]">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium">Currently Borrowed</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-3xl font-black text-amber-400">{onLoanCopies}</div>
          <p className="text-[11px] text-[#86868b] mt-1">Out on active member loan</p>
        </div>
      </div>

      {/* Book Inventory Tracking Table */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-bold text-white">Title Inventory Status</h2>
            <p className="text-xs text-[#86868b]">Breakdown of copies on loan vs available per title</p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filter Pills */}
            <div className="flex p-1 rounded-xl bg-white/5 border border-white/10 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filter === 'all' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('available')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filter === 'available' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                Available ({availableCopies})
              </button>
              <button
                onClick={() => setFilter('on_loan')}
                className={`px-3 py-1 rounded-lg font-medium transition cursor-pointer ${
                  filter === 'on_loan' ? 'bg-[#0071e3] text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                On Loan ({onLoanCopies})
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-3.5 h-3.5 text-[#86868b] absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter catalog…"
                className="w-full pl-9 pr-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#86868b] text-xs animate-pulse">Loading catalog indexes…</div>
        ) : filteredBooks.length === 0 ? (
          <div className="p-12 apple-card text-center text-xs text-[#86868b]">No titles match the filter criteria.</div>
        ) : (
          <div className="overflow-x-auto apple-card rounded-2xl border border-white/10">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02] text-[#86868b] font-medium">
                  <th className="py-3 px-4">Title & Details</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Total Copies</th>
                  <th className="py-3 px-4">Shelf Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredBooks.map((b) => (
                  <tr key={b.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{b.title}</div>
                      <div className="text-[11px] text-[#86868b] font-mono">ISBN {b.isbn} • {b.authors}</div>
                    </td>
                    <td className="py-3 px-4 text-[#86868b]">{b.category_name || 'General'}</td>
                    <td className="py-3 px-4 font-mono font-bold text-white/90">{b.total_copies}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {b.available_copies > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                            {b.available_copies} Available
                          </span>
                        )}
                        {b.on_loan_copies > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                            {b.on_loan_copies} On Loan
                          </span>
                        )}
                        {b.available_copies === 0 && b.on_loan_copies === 0 && (
                          <span className="text-[#86868b] text-[10px]">No active copies</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectBook(b.id)}
                        className="px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#2997ff] text-[11px] font-medium transition cursor-pointer"
                      >
                        Inspect Copies
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
