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
  RefreshCw,
  FileText,
  Info,
  ShieldCheck,
  AlertCircle,
  X,
  CheckCircle2,
  Globe
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
  const [showAccessGuide, setShowAccessGuide] = useState(false);
  const [dismissNotice, setDismissNotice] = useState(false);

  // Check source type
  const isArchiveSource = Boolean(
    iaIdentifier || (readerUrl && readerUrl.includes('archive.org'))
  );

  const baseIaId = iaIdentifier || (
    readerUrl && readerUrl.includes('archive.org')
      ? readerUrl.split('/').filter(Boolean).pop()?.split('?')[0]
      : null
  );

  // Fast embed URL:
  // If Archive.org: use lightweight embed parameter &ui=embed
  // If open-access web reader (e.g. sarabander, opentextbc, jeffe): use the direct URL as-is!
  const fastEmbedUrl = isArchiveSource && baseIaId
    ? `https://archive.org/embed/${baseIaId}?ui=embed`
    : readerUrl;

  const directPdfUrl =
    pdfUrl ||
    (isArchiveSource && baseIaId ? `https://archive.org/download/${baseIaId}/${baseIaId}.pdf` : null);

  const archiveDetailsUrl = isArchiveSource && baseIaId
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
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-base font-bold text-white line-clamp-1 max-w-md sm:max-w-xl">
                {title}
              </h2>
              {isArchiveSource ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/20 hidden sm:inline-flex items-center gap-1">
                  IA Lending
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hidden sm:inline-flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Full Open Access
                </span>
              )}
            </div>
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
              <BookOpen className="w-3.5 h-3.5" /> {isArchiveSource ? 'Preview Reader' : 'Interactive Full Reader'}
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
              <FileText className="w-3.5 h-3.5" /> Direct PDF
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
              <Download className="w-3.5 h-3.5" /> Download
            </a>
          )}

          {/* Dedicated New-Tab Borrow Link for Internet Archive */}
          {archiveDetailsUrl && (
            <a
              href={archiveDetailsUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full book in Internet Archive (Free 1-Hour Borrow)"
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Borrow Full Book (IA)
            </a>
          )}

          {/* Access Help Guide */}
          <button
            onClick={() => setShowAccessGuide(true)}
            title="How to unlock & read full books"
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#2997ff] hover:text-white transition cursor-pointer flex items-center gap-1 text-xs font-medium"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Access Help</span>
          </button>

          <button
            onClick={() => {
              setIframeLoaded(false);
              const cur = activeSrc;
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

      {/* Internet Archive Account & Cookie Limitation Notice */}
      {isArchiveSource && !dismissNotice && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-neutral-900/40 border border-amber-500/20 text-xs text-white/90 flex items-start justify-between gap-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-300">
                Internet Archive Account & Lending Policy
              </p>
              <p className="text-white/80 leading-relaxed text-[11px] sm:text-xs">
                Copyrighted scans on Internet Archive operate under <strong>Controlled Digital Lending (CDL)</strong>, which requires a free Internet Archive account for a 1-hour renewable loan. Because modern browsers block third-party login cookies inside embedded viewers, opening the link directly in a new tab unlocks the entire unabridged text.
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {archiveDetailsUrl && (
                  <a
                    href={archiveDetailsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-medium inline-flex items-center gap-1.5 transition"
                  >
                    <ExternalLink className="w-3 h-3" /> Open in New Tab to Borrow & Read
                  </a>
                )}
                <button
                  onClick={() => setShowAccessGuide(true)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 font-medium inline-flex items-center gap-1 transition cursor-pointer"
                >
                  <Info className="w-3 h-3" /> Learn How to Access Full Books
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={() => setDismissNotice(true)}
            className="text-white/40 hover:text-white/80 p-1 cursor-pointer"
            title="Dismiss notice"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

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
                {isArchiveSource
                  ? 'Loading digital copy from Internet Archive'
                  : 'Streaming high-resolution digital edition'}
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

      {/* Full Access Guide Modal */}
      {showAccessGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#2997ff]" />
                <h3 className="text-base font-bold">Unlocking Full E-Library Books</h3>
              </div>
              <button
                onClick={() => setShowAccessGuide(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-white/80 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#0071e3]/20 text-[#2997ff] flex items-center justify-center text-xs">1</span>
                  Why does Internet Archive ask for an account?
                </h4>
                <p className="text-[#a1a1a6]">
                  Under <strong>Controlled Digital Lending (CDL)</strong>, the Internet Archive loans physical book scans digitally on a 1-to-1 ratio for 1 hour at a time. To manage loan queues and prevent copyright piracy, IA requires a free user account to check out the full scan.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
                <h4 className="font-semibold text-white flex items-center gap-1.5 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#0071e3]/20 text-[#2997ff] flex items-center justify-center text-xs">2</span>
                  Why can't I just log in inside the embedded reader?
                </h4>
                <p className="text-[#a1a1a6]">
                  Safari (ITP), Chrome, and Firefox enforce <strong>third-party cookie blocking</strong> for embedded frames. Archive.org's login cookies are blocked inside any third-party app iframe. Clicking <strong className="text-amber-300">"Borrow Full Book (IA)"</strong> opens Archive.org in its own browser tab where login cookies work immediately.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/20 space-y-1.5">
                <h4 className="font-semibold text-emerald-400 flex items-center gap-1.5 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  3 Best Ways to Read Full Books:
                </h4>
                <ul className="space-y-1.5 list-disc list-inside text-white/90">
                  <li>
                    <strong className="text-white">Open Access Titles (Recommended):</strong> Books like <em>SICP</em>, <em>Database Systems</em>, and <em>Algorithms</em> in our catalog are open educational resources (OER) and open fully without any login!
                  </li>
                  <li>
                    <strong className="text-white">1-Click Tab Borrow:</strong> Click <span className="text-amber-300 font-medium">Borrow Full Book (IA)</span>. Create a free account at archive.org once, click "Borrow for 1 hour", and read uninterrupted.
                  </li>
                  <li>
                    <strong className="text-white">Direct Local PDF Hosting:</strong> The library circulation desk can upload local PDF volumes directly to the server for instant, account-free member streaming.
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowAccessGuide(false)}
                className="apple-pill-btn px-5 py-2 text-xs font-semibold cursor-pointer shadow-md"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
