import React, { useEffect, useState } from 'react';
import api from '../api';
import { Book, User } from '../types';
import { Search, Sparkles, Plus, ArrowRight, Check, Clock } from 'lucide-react';

interface CatalogViewProps {
  user: User | null;
  onSelectBook: (bookId: number) => void;
  onOpenAddBook?: () => void;
}

export const CatalogView: React.FC<CatalogViewProps> = ({ user, onSelectBook, onOpenAddBook }) => {
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.q = search;
      if (selectedCategory) params.category = selectedCategory;

      const res = await api.get('/books', { params });
      setBooks(res.data);
    } catch (err) {
      console.error('Failed to load books', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/books/categories/all');
        setCategories(res.data);
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  return (
    <div className="space-y-16">
      {/* Apple-style Hero Banner */}
      <section className="text-center pt-8 pb-12 relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#86868b] mb-6 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
          <span>Next-Gen Relational Catalog • Sem 5 LCA</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-[1.1]">
          Discover knowledge. <br />
          <span className="bg-gradient-to-r from-[#2997ff] via-[#9d4edd] to-[#ff007f] bg-clip-text text-transparent">
            Lent with precision.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-[#86868b] max-w-xl mx-auto mt-4 leading-relaxed font-normal">
          Explore world-class computing, algorithms, and system literature. Individual physical barcodes tracked with ACID reliability.
        </p>

        {/* Global Search and Category Bar */}
        <div className="mt-10 max-w-2xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row gap-2.5 p-2 rounded-2xl apple-glass shadow-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, author, or ISBN…"
                className="w-full pl-10 pr-4 py-2.5 bg-transparent rounded-xl text-sm text-white placeholder-[#86868b] focus:outline-none"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2.5 bg-white/5 rounded-xl text-xs font-medium text-white/90 border border-white/10 focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-[#1c1c1e] text-white">All Subjects</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#1c1c1e] text-white">
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(user?.role === 'librarian' || user?.role === 'admin') && onOpenAddBook && (
          <div className="mt-6">
            <button
              onClick={onOpenAddBook}
              className="px-5 py-2.5 apple-pill-btn text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Book to Catalog
            </button>
          </div>
        )}
      </section>

      {/* Catalog Grid */}
      <section>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Featured Catalog</h2>
            <p className="text-xs text-[#86868b] mt-0.5">Real-time shelf and checkout metrics</p>
          </div>
          <span className="text-xs text-[#86868b] font-medium font-mono">{books.length} titles available</span>
        </div>

        {loading ? (
          <div className="text-center py-24 text-[#86868b] text-sm animate-pulse">
            Querying relational catalog…
          </div>
        ) : books.length === 0 ? (
          <div className="p-16 rounded-[24px] apple-card text-center">
            <h3 className="text-lg font-semibold text-white">No results found</h3>
            <p className="text-xs text-[#86868b] mt-1">Try another search query or clear filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books.map((book) => {
              const hasAvailable = book.available_copies > 0;
              return (
                <div
                  key={book.id}
                  onClick={() => onSelectBook(book.id)}
                  className="apple-card p-6 flex flex-col justify-between group cursor-pointer relative overflow-hidden"
                >
                  {/* Subtle top glow on card hover */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#0071e3]/40 to-transparent opacity-0 group-hover:opacity-100 transition duration-500" />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-[#86868b]">
                        {book.category_name || 'Literature'}
                      </span>
                      {book.reader_url || book.pdf_url ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-[#2997ff] border border-blue-500/20">
                          E-Reader Ready
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-[#86868b]">{book.isbn}</span>
                      )}
                    </div>

                    <div className="flex gap-4">
                      {book.cover_image_url && (
                        <div className="w-16 h-22 rounded-lg overflow-hidden bg-[#2c2c2e] shrink-0 border border-white/10">
                          <img
                            src={book.cover_image_url}
                            alt={book.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-white group-hover:text-[#2997ff] transition leading-snug line-clamp-2">
                          {book.title}
                        </h3>
                        <p className="text-xs text-[#86868b] mt-1.5 line-clamp-1">
                          By <span className="text-white/80 font-medium">{book.authors || 'Unknown'}</span>
                        </p>
                      </div>
                    </div>

                    {book.description && (
                      <p className="text-xs text-[#86868b] mt-4 line-clamp-2 leading-relaxed">
                        {book.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-6 mt-6 border-t border-white/5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {hasAvailable ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-medium text-[11px] border border-emerald-500/20">
                          <Check className="w-3 h-3" />
                          {book.available_copies} of {book.total_copies} on shelf
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium text-[11px] border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          All copies on loan
                        </span>
                      )}
                    </div>

                    <span className="text-xs text-[#2997ff] font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      View <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
