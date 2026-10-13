import React, { useEffect, useState } from 'react';
import { User } from './types';
import { CatalogView } from './components/CatalogView';
import { BookDetailModal } from './components/BookDetailModal';
import { CirculationDesk } from './components/CirculationDesk';
import { MemberDashboard } from './components/MemberDashboard';
import { MemberManagement } from './components/MemberManagement';
import { ReportsView } from './components/ReportsView';
import { LoginModal } from './components/LoginModal';
import { AddBookModal } from './components/AddBookModal';
import { OpenCatalogBrowser } from './components/OpenCatalogBrowser';
import { BookReaderView } from './components/BookReaderView';
import { LibrarianDashboard } from './components/LibrarianDashboard';
import { OpenLibraryDoc, Book } from './types';

import {
  Apple,
  BookOpen,
  ArrowRightLeft,
  Users,
  BarChart3,
  Bookmark,
  LogIn,
  LogOut,
  Globe,
  Layers,
  Shield,
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'open-archive' | 'librarian-desk' | 'circulation' | 'my-account' | 'members' | 'reports'>('catalog');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
  const [activeReadingBook, setActiveReadingBook] = useState<{
    title: string;
    authors: string;
    readerUrl?: string | null;
    pdfUrl?: string | null;
    iaIdentifier?: string | null;
  } | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAddBookModal, setShowAddBookModal] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem('library_user');
    const token = localStorage.getItem('library_token');
    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (err) {
        console.error('Failed to parse cached user', err);
      }
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('library_token');
    localStorage.removeItem('library_user');
    setCurrentUser(null);
    setActiveTab('catalog');
  };

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-[#000000] text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3] selection:text-white">
      {/* Apple-style Global Nav Header */}
      <header className="sticky top-0 z-50 apple-glass border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center justify-between">
          {/* Logo brand */}
          <div
            onClick={() => {
              setActiveTab('catalog');
              setSelectedBookId(null);
            }}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Apple className="w-4 h-4 text-white/90 group-hover:text-white transition" />
            <span className="text-xs font-semibold tracking-tight text-white/95">LiberFlow</span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-7 text-[12px] text-white/70 font-normal">
            <button
              onClick={() => {
                setActiveTab('catalog');
                setSelectedBookId(null);
                setActiveReadingBook(null);
              }}
              className={`hover:text-white transition cursor-pointer ${
                activeTab === 'catalog' && !activeReadingBook ? 'text-white font-semibold' : ''
              }`}
            >
              Catalog
            </button>

            <button
              onClick={() => {
                setActiveTab('open-archive');
                setSelectedBookId(null);
                setActiveReadingBook(null);
              }}
              className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'open-archive' && !activeReadingBook ? 'text-white font-semibold' : ''
              }`}
            >
              <Globe className="w-3.5 h-3.5 text-[#2997ff]" />
              <span>Open E-Library</span>
            </button>

            {/* Member Dedicated View */}
            {currentUser?.role === 'member' && (
              <button
                onClick={() => {
                  setActiveTab('my-account');
                  setSelectedBookId(null);
                  setActiveReadingBook(null);
                }}
                className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'my-account' && !activeReadingBook ? 'text-white font-semibold' : ''
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-[#2997ff]" />
                <span>My Borrowed & Holds</span>
              </button>
            )}

            {/* Librarian Dedicated View */}
            {(currentUser?.role === 'librarian' || currentUser?.role === 'admin') && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('librarian-desk');
                    setSelectedBookId(null);
                    setActiveReadingBook(null);
                  }}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'librarian-desk' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#2997ff]" />
                  <span>Librarian Dashboard</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('circulation');
                    setSelectedBookId(null);
                    setActiveReadingBook(null);
                  }}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'circulation' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Circulation Desk</span>
                </button>
              </>
            )}

            {/* Admin Dedicated View */}
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('members');
                    setSelectedBookId(null);
                    setActiveReadingBook(null);
                  }}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'members' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Member Accounts</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setSelectedBookId(null);
                    setActiveReadingBook(null);
                  }}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'reports' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Admin Reports</span>
                </button>
              </>
            )}
          </nav>

          {/* User Status / Login Pill */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <div className="text-[11px] font-medium text-white/90">{currentUser.name}</div>
                  <div className="text-[10px] text-[#86868b] capitalize">
                    {currentUser.role}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="apple-pill-btn px-4 py-1 text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <LogIn className="w-3 h-3" /> Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-black/60 border-t border-white/5 gap-4 text-xs text-white/70">
          <button
            onClick={() => {
              setActiveTab('catalog');
              setSelectedBookId(null);
              setActiveReadingBook(null);
            }}
            className={`whitespace-nowrap ${activeTab === 'catalog' && !activeReadingBook ? 'text-white font-bold' : ''}`}
          >
            Catalog
          </button>
          <button
            onClick={() => {
              setActiveTab('open-archive');
              setSelectedBookId(null);
              setActiveReadingBook(null);
            }}
            className={`whitespace-nowrap ${activeTab === 'open-archive' && !activeReadingBook ? 'text-white font-bold' : ''}`}
          >
            Open E-Library
          </button>
          {currentUser?.role === 'member' && (
            <button
              onClick={() => {
                setActiveTab('my-account');
                setSelectedBookId(null);
                setActiveReadingBook(null);
              }}
              className={`whitespace-nowrap ${activeTab === 'my-account' ? 'text-white font-bold' : ''}`}
            >
              My Loans & Holds
            </button>
          )}
          {(currentUser?.role === 'librarian' || currentUser?.role === 'admin') && (
            <>
              <button
                onClick={() => {
                  setActiveTab('librarian-desk');
                  setSelectedBookId(null);
                  setActiveReadingBook(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'librarian-desk' ? 'text-white font-bold' : ''}`}
              >
                Librarian Desk
              </button>
              <button
                onClick={() => {
                  setActiveTab('circulation');
                  setSelectedBookId(null);
                  setActiveReadingBook(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'circulation' ? 'text-white font-bold' : ''}`}
              >
                Circulation
              </button>
            </>
          )}
          {currentUser?.role === 'admin' && (
            <>
              <button
                onClick={() => {
                  setActiveTab('members');
                  setSelectedBookId(null);
                  setActiveReadingBook(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'members' ? 'text-white font-bold' : ''}`}
              >
                Members
              </button>
              <button
                onClick={() => {
                  setActiveTab('reports');
                  setSelectedBookId(null);
                  setActiveReadingBook(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'reports' ? 'text-white font-bold' : ''}`}
              >
                Admin Reports
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className={`mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 w-full ${activeReadingBook ? 'max-w-[96vw] xl:max-w-[1550px]' : 'max-w-6xl'}`}>
        {activeReadingBook ? (
          <BookReaderView
            title={activeReadingBook.title}
            authors={activeReadingBook.authors}
            readerUrl={activeReadingBook.readerUrl}
            pdfUrl={activeReadingBook.pdfUrl}
            iaIdentifier={activeReadingBook.iaIdentifier}
            onBack={() => setActiveReadingBook(null)}
          />
        ) : selectedBookId !== null ? (
          <BookDetailModal
            bookId={selectedBookId}
            user={currentUser}
            onBack={() => setSelectedBookId(null)}
            onRefresh={triggerRefresh}
            onOpenReader={(b) => {
              setActiveReadingBook({
                title: b.title,
                authors: b.authors,
                readerUrl: b.reader_url,
                pdfUrl: b.pdf_url,
                iaIdentifier: b.ia_identifier,
              });
            }}
          />
        ) : activeTab === 'catalog' ? (
          <CatalogView
            key={refreshTrigger}
            user={currentUser}
            onSelectBook={(id) => setSelectedBookId(id)}
            onOpenAddBook={() => setShowAddBookModal(true)}
            onNavigateToOpenLibrary={() => setActiveTab('open-archive')}
          />
        ) : activeTab === 'open-archive' ? (
          <OpenCatalogBrowser
            onReadOnline={(doc) => {
              setActiveReadingBook({
                title: doc.title,
                authors: doc.author_name.join(', '),
                readerUrl: doc.reader_url,
                pdfUrl: doc.pdf_url,
                iaIdentifier: doc.ia_identifier,
              });
            }}
          />
        ) : activeTab === 'librarian-desk' ? (
          <LibrarianDashboard
            onOpenAddBook={() => setShowAddBookModal(true)}
            onGoToCirculation={() => setActiveTab('circulation')}
            onSelectBook={(id) => setSelectedBookId(id)}
          />
        ) : activeTab === 'circulation' ? (
          <CirculationDesk />
        ) : activeTab === 'my-account' ? (
          <MemberDashboard />
        ) : activeTab === 'members' ? (
          <MemberManagement />
        ) : activeTab === 'reports' ? (
          <ReportsView />
        ) : null}
      </main>

      {/* Apple-style Clean Footer */}
      <footer className="border-t border-white/[0.08] bg-[#000000] py-10 text-center text-[11px] text-[#86868b]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-2">
          <p>
            Copyright © 2026 LiberFlow Systems. Built for DBMS Semester 5 LCA • Powered by Relational Architecture & ACID Concurrency.
          </p>
          <div className="flex justify-center gap-4 text-white/50 text-[10px]">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Circulation</span>
            <span>•</span>
            <span>Library Regulations</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showLoginModal && (
        <LoginModal
          onSuccess={(user) => {
            setCurrentUser(user);
            setShowLoginModal(false);
            if (user.role === 'librarian') {
              setActiveTab('librarian-desk');
            } else if (user.role === 'member') {
              setActiveTab('my-account');
            } else if (user.role === 'admin') {
              setActiveTab('reports');
            }
          }}
          onClose={() => setShowLoginModal(false)}
        />
      )}

      {showAddBookModal && (
        <AddBookModal
          onClose={() => setShowAddBookModal(false)}
          onSuccess={() => {
            triggerRefresh();
          }}
        />
      )}
    </div>
  );
}

export default App;
