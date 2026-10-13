import React, { useEffect, useState } from 'react';
import api from '../api';
import { X, BookPlus, AlertCircle } from 'lucide-react';

interface AddBookModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ onClose, onSuccess }) => {
  const [isbn, setIsbn] = useState('');
  const [title, setTitle] = useState('');
  const [authors, setAuthors] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publishedYear] = useState<number>(2024);
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [initialCopies, setInitialCopies] = useState<number>(2);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCats = async () => {
      try {
        const res = await api.get('/books/categories/all');
        setCategories(res.data);
        if (res.data.length > 0) {
          setCategoryId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCats();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const authorList = authors
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a.length > 0);

      if (authorList.length === 0) {
        setError('At least one author must be specified');
        setLoading(false);
        return;
      }

      await api.post('/books', {
        isbn: isbn.trim(),
        title: title.trim(),
        authors: authorList,
        publisher: publisher.trim() || undefined,
        publishedYear: Number(publishedYear) || undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        description: description.trim() || undefined,
        initialCopies: Number(initialCopies),
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add book to catalog');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="relative bg-[#1d1d1f] rounded-[24px] shadow-2xl max-w-lg w-full border border-white/10 overflow-hidden my-8 text-white">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#0071e3]/20 flex items-center justify-center text-[#2997ff]">
              <BookPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-xl tracking-tight">Add Title to Catalog</h2>
              <p className="text-xs text-[#86868b]">Register catalog metadata and auto-mint copy barcodes</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 pt-2 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                ISBN Number
              </label>
              <input
                type="text"
                required
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                placeholder="e.g. 978-0132350884"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3] font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Subject Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id} className="bg-[#1c1c1e] text-white">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
              Book Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Designing Data-Intensive Applications"
              className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
              Author(s) (Comma-separated)
            </label>
            <input
              type="text"
              required
              value={authors}
              onChange={(e) => setAuthors(e.target.value)}
              placeholder="e.g. Martin Kleppmann"
              className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Publisher
              </label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="e.g. O'Reilly Media"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Initial Physical Copies
              </label>
              <input
                type="number"
                min="0"
                max="20"
                value={initialCopies}
                onChange={(e) => setInitialCopies(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Book syllabus overview and contents…"
              className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-semibold text-[#86868b] hover:text-white cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="apple-pill-btn px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-lg shadow-blue-500/20 disabled:opacity-50"
            >
              {loading ? 'Minting Barcodes…' : 'Add to Catalog'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
