import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Download, ExternalLink, Maximize2, Minimize2, Sparkles } from 'lucide-react';

interface BookReaderViewProps {
  title: string;
  authors: string;
  readerUrl?: string | null;
  pdfUrl?: string | null;
  iaIdentifier?: string | null;
  onBack: () => void;
}

export const BookReaderView: React.FC<BookReaderViewProps> = ({
  title,
  authors,
  readerUrl,
  pdfUrl,
  iaIdentifier,
  onBack,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<'reader' | 'pdf'>('reader');

  // Derive embed URLs if only iaIdentifier is given
  const activeReaderUrl =
    readerUrl ||
    (iaIdentifier ? `https://archive.org/embed/${iaIdentifier}` : null);

  const activePdfUrl =
    pdfUrl ||
    (iaIdentifier ? `https://archive.org/download/${iaIdentifier}/${iaIdentifier}.pdf` : null);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`flex flex-col transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#000000] p-0'
          : 'space-y-4 max-w-6xl mx-auto'
      }`}
    >
      {/* Top Apple-Style E-Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl apple-glass border border-white/10 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="border-l border-white/10 pl-3">
            <h2 className="text-xs sm:text-sm font-bold text-white line-clamp-1 max-w-md">
              {title}
            </h2>
            <p className="text-[11px] text-[#86868b] line-clamp-1">By {authors}</p>
          </div>
        </div>

        {/* View Mode Controls & Direct Actions */}
        <div className="flex items-center gap-2">
          {activeReaderUrl && (
            <button
              onClick={() => setViewMode('reader')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'reader'
                  ? 'bg-[#0071e3] text-white shadow-md'
                  : 'bg-white/5 text-white/70 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Interactive Reader
            </button>
          )}

          {activePdfUrl && (
            <a
              href={activePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Download PDF
            </a>
          )}

          {activeReaderUrl && (
            <a
              href={activeReaderUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full page in archive.org"
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Reader Iframe Container */}
      <div
        className={`rounded-2xl overflow-hidden border border-white/10 bg-[#161617] relative shadow-2xl flex-1 ${
          isFullscreen ? 'h-[calc(100vh-64px)] rounded-none border-none' : 'h-[750px]'
        }`}
      >
        {activeReaderUrl ? (
          <iframe
            src={activeReaderUrl}
            title={`Reading ${title}`}
            className="w-full h-full border-0"
            allowFullScreen
          />
        ) : activePdfUrl ? (
          <iframe
            src={activePdfUrl}
            title={`PDF ${title}`}
            className="w-full h-full border-0"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#86868b] space-y-4">
            <Sparkles className="w-8 h-8 text-[#0071e3]" />
            <p className="text-sm font-semibold text-white">Digital Copy Currently Processing</p>
            <p className="text-xs max-w-sm">
              This title is tracked in our physical catalog stacks. You can place a hold or check out a physical copy at the circulation desk.
            </p>
            <button
              onClick={onBack}
              className="apple-pill-btn px-5 py-2 text-xs font-semibold cursor-pointer"
            >
              Return to Catalog Details
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
