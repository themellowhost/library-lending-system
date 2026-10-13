import React, { useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Download,
  ExternalLink,
  Maximize2,
  Minimize2,
  Sparkles,
  Loader2,
  ZoomIn,
  RefreshCw,
  FileText
} from 'lucide-react';

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
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<'reader' | 'pdf' | 'embed'>('reader');

  // Derive optimized URLs:
  // For Internet Archive, adding &ui=embed loads the lightweight reader with no header bloat
  const baseIaId = iaIdentifier || (readerUrl ? readerUrl.split('/').pop()?.split('?')[0] : null);

  const fastEmbedUrl = baseIaId
    ? `https://archive.org/embed/${baseIaId}?ui=embed`
    : readerUrl;

  const directPdfUrl =
    pdfUrl ||
    (baseIaId ? `https://archive.org/download/${baseIaId}/${baseIaId}.pdf` : null);

  const archiveDetailsUrl = baseIaId
    ? `https://archive.org/details/${baseIaId}`
    : null;

  const activeSrc = viewMode === 'pdf' && directPdfUrl ? directPdfUrl : fastEmbedUrl;

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div
      className={`flex flex-col transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#000000] p-3'
          : 'space-y-4 w-full max-w-[96vw] xl:max-w-[1500px] mx-auto'
      }`}
    >
      {/* Apple-Style E-Reader Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl apple-glass border border-white/10 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/90 hover:text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>

          <div className="border-l border-white/10 pl-3">
            <h2 className="text-xs sm:text-base font-bold text-white line-clamp-1 max-w-md sm:max-w-xl">
              {title}
            </h2>
            <p className="text-[11px] text-[#86868b] line-clamp-1">By {authors}</p>
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2">
          {fastEmbedUrl && (
            <button
              onClick={() => {
                setViewMode('reader');
                setIframeLoaded(false);
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'reader'
                  ? 'bg-[#0071e3] text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Interactive 2-Page Reader
            </button>
          )}

          {directPdfUrl && (
            <button
              onClick={() => {
                setViewMode('pdf');
                setIframeLoaded(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'pdf'
                  ? 'bg-[#0071e3] text-white shadow-lg shadow-blue-500/25'
                  : 'bg-white/5 text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileText className="w-3.5 h-3.5" /> Fullscreen PDF
            </button>
          )}

          {directPdfUrl && (
            <a
              href={directPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
              title="Download direct PDF file"
            >
              <Download className="w-3.5 h-3.5" /> Direct PDF
            </a>
          )}

          {archiveDetailsUrl && (
            <a
              href={archiveDetailsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open source in Internet Archive"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            onClick={() => {
              setIframeLoaded(false);
              const cur = activeSrc;
              // Trigger reload
              const iframe = document.getElementById('book-reader-iframe') as HTMLIFrameElement;
              if (iframe && cur) iframe.src = cur;
            }}
            title="Reload Reader"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Theater Mode'}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 text-[#2997ff]" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Reader Viewport */}
      <div
        className={`w-full rounded-2xl overflow-hidden border border-white/10 bg-[#0d0d0e] relative shadow-2xl flex flex-col ${
          isFullscreen
            ? 'h-[calc(100vh-80px)] rounded-xl'
            : 'h-[86vh] min-h-[750px] max-h-[1100px]'
        }`}
      >
        {/* Loading Spinner with progress feedback */}
        {!iframeLoaded && activeSrc && (
          <div className="absolute inset-0 bg-[#0d0d0e]/95 flex flex-col items-center justify-center gap-3 z-10 transition-opacity">
            <Loader2 className="w-8 h-8 text-[#0071e3] animate-spin" />
            <div className="text-center">
              <p className="text-sm font-semibold text-white">Streaming Digital Volume…</p>
              <p className="text-xs text-[#86868b] mt-1">
                Optimizing high-resolution page spreads for quick reading
              </p>
            </div>
          </div>
        )}

        {activeSrc ? (
          <iframe
            id="book-reader-iframe"
            src={activeSrc}
            title={`Reading ${title}`}
            onLoad={() => setIframeLoaded(true)}
            className="w-full h-full border-0 rounded-2xl bg-[#000000]"
            allow="fullscreen; clipboard-read; clipboard-write"
            loading="eager"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-[#86868b] space-y-4">
            <Sparkles className="w-10 h-10 text-[#0071e3]" />
            <h3 className="text-base font-semibold text-white">Physical Copy in Main Library</h3>
            <p className="text-xs max-w-md mx-auto leading-relaxed">
              This volume is held in the library physical collection. You can borrow or place a hold on this copy from the catalog.
            </p>
            <button
              onClick={onBack}
              className="apple-pill-btn px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-md"
            >
              Back to Catalog
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
