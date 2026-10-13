import React, { useEffect, useState } from 'react';
import api from '../api';
import { Book, User } from '../types';
import { ArrowLeft, Bookmark, Plus, Barcode, MapPin, Check, Clock, AlertCircle } from 'lucide-react';

interface BookDetailModalProps {
  bookId: number;
  user: User | null;
  onBack: () => void;
  onRefresh: () => void;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({ bookId, user, onBack, onRefresh }) => {
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [newBarcode, setNewBarcode] = useState('');
  const [newLocation, setNewLocation] = useState('Main Stacks');
  const [showAddCopy, setShowAddCopy] = useState(false);

  const loadBook = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/books/${bookId}`);
      setBook(res.data);
    } catch (err) {
      console.error('Failed to load book', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBook();
  }, [bookId]);

  const handlePlaceHold = async () => {
    setActionMessage(null);
    try {
      const res = await api.post('/holds', { bookId });
      setActionMessage({ text: `${res.data.message}! Queue Position: #${res.data.hold.queuePosition}`, type: 'success' });
      loadBook();
      onRefresh();
    } catch (err: any) {
      setActionMessage({ text: err.response?.data?.error || 'Failed to place hold', type: 'error' });
    }
  };

  const handleAddCopy = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionMessage(null);
    try {
      await api.post(`/books/${bookId}/copies`, {
        barcode: newBarcode || undefined,
        location: newLocation,
      });
      setActionMessage({ text: 'Physical copy successfully added to catalog inventory.', type: 'success' });
      setNewBarcode('');
      setShowAddCopy(false);
      loadBook();
      onRefresh();
    } catch (err: any) {
      setActionMessage({ text: err.response?.data?.error || 'Failed to add copy', type: 'error' });
    }
  };

  if (loading) {
    return <div className="text-center py-24 text-[#86868b] text-sm animate-pulse">Loading hardware specifications…</div>;
  }

  if (!book) {
    return <div className="text-center py-24 text-red-400 text-sm">Book not found.</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-[#86868b] hover:text-white transition cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Catalog
      </button>

      {actionMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-sm ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <Check className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Main Title Hero Section */}
      <div className="apple-card p-8 sm:p-12 relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-between items-start gap-8">
          <div className="space-y-3 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#86868b]">
                {book.category_name || 'Subject'}
              </span>
              <span className="text-xs font-mono text-[#86868b]">ISBN {book.isbn}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {book.title}
            </h1>

            <p className="text-sm text-[#86868b]">
              Authored by <span className="text-white font-medium">{book.authors}</span>
            </p>

            <div className="flex flex-wrap gap-4 text-xs text-[#86868b] pt-2">
              {book.publisher && <span>Publisher: <span className="text-white/80">{book.publisher}</span></span>}
              {book.published_year && <span>Edition Year: <span className="text-white/80">{book.published_year}</span></span>}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            {user?.role === 'member' && (
              <button
                onClick={handlePlaceHold}
                className="apple-pill-btn px-6 py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Place Hold
              </button>
            )}

            {(user?.role === 'librarian' || user?.role === 'admin') && (
              <button
                onClick={() => setShowAddCopy(!showAddCopy)}
                className="apple-secondary-btn px-6 py-3 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                {showAddCopy ? 'Cancel' : 'Add Physical Copy'}
              </button>
            )}
          </div>
        </div>

        {book.description && (
          <div className="mt-8 pt-8 border-t border-white/10 text-sm text-[#86868b] leading-relaxed">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-white/50 mb-2">Overview</h4>
            <p>{book.description}</p>
          </div>
        )}
      </div>

      {/* Add Copy Inline Drawer */}
      {showAddCopy && (
        <form onSubmit={handleAddCopy} className="apple-card p-8 border-white/20 space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Barcode className="w-4 h-4 text-[#2997ff]" /> Mint Physical Item Barcode
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Barcode (Leave blank for auto-generation)
              </label>
              <input
                type="text"
                value={newBarcode}
                onChange={(e) => setNewBarcode(e.target.value)}
                placeholder="e.g. BC-008431"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Shelf Location
              </label>
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Floor 2, Shelf B4"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="apple-pill-btn px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-md"
          >
            Confirm & Save to Database
          </button>
        </form>
      )}

      {/* Physical Copies Inventory Table */}
      <div className="apple-card p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-white">Physical Inventory</h3>
            <p className="text-xs text-[#86868b] mt-0.5">
              {book.copies?.length || 0} items tracked individually by barcode
            </p>
          </div>
          <span className="text-xs text-[#86868b]">
            Active Hold Queue: <span className="font-semibold text-white">{book.activeHoldsCount || 0}</span>
          </span>
        </div>

        {book.copies && book.copies.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Barcode</th>
                  <th className="py-3 px-4">Lending Status</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {book.copies.map((copy) => (
                  <tr key={copy.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-4 font-mono font-medium text-white flex items-center gap-2">
                      <Barcode className="w-4 h-4 text-[#86868b]" />
                      {copy.barcode}
                    </td>
                    <td className="py-4 px-4">
                      {copy.status === 'available' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium inline-flex items-center gap-1.5">
                          <Check className="w-3 h-3" /> Available
                        </span>
                      )}
                      {copy.status === 'on_loan' && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-medium inline-flex items-center gap-1.5">
                          <Clock className="w-3 h-3" /> On Loan
                        </span>
                      )}
                      {copy.status === 'on_hold' && (
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 text-xs font-medium inline-flex items-center gap-1.5">
                          <Bookmark className="w-3 h-3" /> Hold (Pickup)
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-[#86868b] flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#86868b]" />
                      {copy.location}
                    </td>
                    <td className="py-4 px-4 text-xs text-[#86868b]">
                      {new Date(copy.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-[#86868b] text-xs">
            No physical copies currently registered for this title.
          </div>
        )}
      </div>
    </div>
  );
};
