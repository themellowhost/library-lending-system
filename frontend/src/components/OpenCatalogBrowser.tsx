import React, { useState } from 'react';
import api from '../api';
import { OpenLibraryDoc } from '../types';
import { Search, BookOpen, Download, ExternalLink, Sparkles, BookCheck, Loader2 } from 'lucide-react';

interface OpenCatalogBrowserProps {
  onReadOnline: (doc: OpenLibraryDoc) => void;
}

export const OpenCatalogBrowser: React.FC<OpenCatalogBrowserProps> = ({ onReadOnline }) => {
  const [query, setQuery] = useState('computer science');
  const [docs, setDocs] = useState<OpenLibraryDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const searchOpenLibrary = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await api.get('/books/open-search', {
        params: { q: searchQuery },
      });
      setDocs(res.data.docs || []);
    } catch (err) {
      console.error('Failed to search Open Library archive', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    searchOpenLibrary(query);
  };

  // Preset topics for quick discovery
  const presetQueries = [
    'Operating Systems',
    'Relational Database',
    'Alan Turing',
    'Artificial Intelligence',
    'Steve Jobs',
    'Data Structures',
  ];

  return (
    <div className="space-y-12">
      {/* Header Banner */}
      <section className="text-center pt-6 pb-8 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-[#86868b] mb-4 backdrop-blur-md">
          <Sparkles className="w-3.5 h-3.5 text-[#2997ff]" />
          <span>Open Library & Internet Archive Integration</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white max-w-2xl mx-auto leading-tight">
          Explore Millions of Free, <br />
          <span className="bg-gradient-to-r from-[#2997ff] via-[#9d4edd] to-[#ff007f] bg-clip-text text-transparent">
            Open-Access Books.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#86868b] max-w-lg mx-auto mt-3">
          Instant full-text online e-reader and verified PDF downloads from global open source archives.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="mt-8 max-w-xl mx-auto px-4">
          <div className="flex gap-2 p-1.5 rounded-2xl apple-glass shadow-2xl">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search titles, authors, research papers..."
                className="w-full pl-10 pr-4 py-2.5 bg-transparent rounded-xl text-sm text-white placeholder-[#86868b] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="apple-pill-btn px-5 py-2.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              <span>Search</span>
            </button>
          </div>

          {/* Quick Filter Tags */}
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {presetQueries.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  searchOpenLibrary(item);
                }}
                className="px-3 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-[#86868b] hover:text-white transition cursor-pointer"
              >
                {item}
              </button>
            ))}
          </div>
        </form>
      </section>

      {/* Results Grid */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-white">Full-Text Available Titles</h2>
            <p className="text-xs text-[#86868b]">Read directly in browser without checkout constraints</p>
          </div>
          {docs.length > 0 && (
            <span className="text-xs font-mono text-[#86868b]">{docs.length} books found</span>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20 text-[#86868b] text-sm flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-[#0071e3]" />
            <span>Scanning Open Library full-text repositories…</span>
          </div>
        ) : docs.length === 0 ? (
          <div className="p-16 rounded-[24px] apple-card text-center">
            <BookOpen className="w-8 h-8 text-[#86868b] mx-auto mb-3 opacity-60" />
            <h3 className="text-base font-semibold text-white">
              {searched ? 'No books found for this query' : 'Enter a query to explore online books'}
            </h3>
            <p className="text-xs text-[#86868b] mt-1 max-w-sm mx-auto">
              Search by title, author, or click any topic above to discover free online volumes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map((doc) => (
              <div
                key={doc.key}
                className="apple-card p-6 flex flex-col justify-between group relative overflow-hidden"
              >
                <div className="flex gap-4">
                  {/* Book Cover Image */}
                  <div className="w-20 h-28 bg-[#2c2c2e] rounded-xl overflow-hidden shrink-0 border border-white/10 flex items-center justify-center relative">
                    {doc.cover_image_url ? (
                      <img
                        src={doc.cover_image_url}
                        alt={doc.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <BookOpen className="w-6 h-6 text-[#86868b]" />
                    )}
                  </div>

                  {/* Title & Author Details */}
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 inline-block mb-1.5">
                      Full Text Online
                    </span>
                    <h3 className="text-sm font-bold text-white group-hover:text-[#2997ff] transition leading-snug line-clamp-2">
                      {doc.title}
                    </h3>
                    <p className="text-xs text-[#86868b] mt-1 line-clamp-1">
                      {doc.author_name.join(', ')}
                    </p>
                    {doc.first_publish_year && (
                      <p className="text-[11px] font-mono text-white/40 mt-1">
                        First Published: {doc.first_publish_year}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions: Read Online / PDF */}
                <div className="pt-5 mt-5 border-t border-white/5 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onReadOnline(doc)}
                    className="apple-pill-btn px-4 py-2 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Read Online
                  </button>

                  <div className="flex items-center gap-2">
                    {doc.pdf_url && (
                      <a
                        href={doc.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                        title="Download PDF"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {doc.reader_url && (
                      <a
                        href={doc.reader_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
                        title="Open in Internet Archive"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
