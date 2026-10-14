import React, { useEffect, useState } from 'react';
import { User, TabType } from './types';
import { CatalogView } from './components/CatalogView';
import { BookDetailModal } from './components/BookDetailModal';
import { CirculationDesk } from './components/CirculationDesk';
import { MemberDashboard } from './components/MemberDashboard';
import { MemberManagement } from './components/MemberManagement';
import { ReportsView } from './components/ReportsView';
import { LoginModal } from './components/LoginModal';
import { AddBookModal } from './components/AddBookModal';
import { BookReaderView } from './components/BookReaderView';
import { LibrarianDashboard } from './components/LibrarianDashboard';
import { Book } from './types';

import {
  Apple,
  ArrowRightLeft,
  Users,
  BarChart3,
  Bookmark,
  LogIn,
  LogOut,
  Layers,
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('catalog');
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

  // Strict role-based view enforcement: prevent any role from accessing unnecessary or unauthorized views
  useEffect(() => {
    if (!currentUser) {
      if (activeTab !== 'catalog') {
        setActiveTab('catalog');
      }
    } else if (currentUser.role === 'member') {
      if (!['catalog', 'my-account'].includes(activeTab)) {
        setActiveTab('catalog');
      }
    } else if (currentUser.role === 'librarian') {
      if (!['catalog', 'librarian-desk', 'circulation'].includes(activeTab)) {
        setActiveTab('catalog');
      }
    }
  }, [currentUser, activeTab]);

  // When logging out, completely clear credentials, reset the view back to home (catalog),
  // and close any active readers or modals.
  const handleLogout = () => {
    localStorage.removeItem('library_token');
    localStorage.removeItem('library_user');
    setCurrentUser(null);
    setActiveTab('catalog');
    setSelectedBookId(null);
    setActiveReadingBook(null);
    setShowAddBookModal(false);
  };

  const navigateToTab = (tab: TabType) => {
    setActiveTab(tab);
    setSelectedBookId(null);
    setActiveReadingBook(null);
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
            onClick={() => navigateToTab('catalog')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <Apple className="w-4 h-4 text-white/90 group-hover:text-white transition" />
            <span className="text-xs font-semibold tracking-tight text-white/95">LiberFlow</span>
          </div>

          {/* Navigation Links - Strictly filtered per membership level */}
          <nav className="hidden md:flex items-center gap-7 text-[12px] text-white/70 font-normal">
            {/* Catalog is the universal home for everyone */}
            <button
              onClick={() => navigateToTab('catalog')}
              className={`hover:text-white transition cursor-pointer ${
                activeTab === 'catalog' && !activeReadingBook ? 'text-white font-semibold' : ''
              }`}
            >
              Catalog
            </button>

            {/* Member Level: ONLY sees 'My Borrowed & Holds' */}
            {currentUser?.role === 'member' && (
              <button
                onClick={() => navigateToTab('my-account')}
                className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'my-account' && !activeReadingBook ? 'text-white font-semibold' : ''
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 text-[#2997ff]" />
                <span>My Borrowed & Holds</span>
              </button>
            )}

            {/* Librarian & Admin Level: Librarian Desk & Circulation Desk */}
            {(currentUser?.role === 'librarian' || currentUser?.role === 'admin') && (
              <>
                <button
                  onClick={() => navigateToTab('librarian-desk')}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'librarian-desk' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-[#2997ff]" />
                  <span>Librarian Dashboard</span>
                </button>

                <button
                  onClick={() => navigateToTab('circulation')}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'circulation' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Circulation Desk</span>
                </button>
              </>
            )}

            {/* Admin Level ONLY: Member Accounts & System Reports */}
            {currentUser?.role === 'admin' && (
              <>
                <button
                  onClick={() => navigateToTab('members')}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'members' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Member Accounts</span>
                </button>

                <button
                  onClick={() => navigateToTab('reports')}
                  className={`hover:text-white transition cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'reports' && !activeReadingBook ? 'text-white font-semibold' : ''
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>Admin Reports</span>
                </button>
              </>
            )}

            {/* Non-logged-in visitors see NO other views or portal buttons */}
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
                  title="Sign out & return to home"
                  className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 flex items-center gap-1.5 text-white/80 hover:text-white transition cursor-pointer text-xs"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="hidden sm:inline">Sign Out</span>
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

        {/* Mobile Navigation bar - ONLY shown when user has secondary views */}
        {currentUser && (
          <div className="md:hidden flex overflow-x-auto px-4 py-2 bg-black/60 border-t border-white/5 gap-4 text-xs text-white/70">
            <button
              onClick={() => navigateToTab('catalog')}
              className={`whitespace-nowrap ${activeTab === 'catalog' && !activeReadingBook ? 'text-white font-bold' : ''}`}
            >
              Catalog
            </button>

            {currentUser.role === 'member' && (
              <button
                onClick={() => navigateToTab('my-account')}
                className={`whitespace-nowrap ${activeTab === 'my-account' ? 'text-white font-bold' : ''}`}
              >
                My Loans & Holds
              </button>
            )}

            {(currentUser.role === 'librarian' || currentUser.role === 'admin') && (
              <>
                <button
                  onClick={() => navigateToTab('librarian-desk')}
                  className={`whitespace-nowrap ${activeTab === 'librarian-desk' ? 'text-white font-bold' : ''}`}
                >
                  Librarian Desk
                </button>
                <button
                  onClick={() => navigateToTab('circulation')}
                  className={`whitespace-nowrap ${activeTab === 'circulation' ? 'text-white font-bold' : ''}`}
                >
                  Circulation
                </button>
              </>
            )}

            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => navigateToTab('members')}
                  className={`whitespace-nowrap ${activeTab === 'members' ? 'text-white font-bold' : ''}`}
                >
                  Members
                </button>
                <button
                  onClick={() => navigateToTab('reports')}
                  className={`whitespace-nowrap ${activeTab === 'reports' ? 'text-white font-bold' : ''}`}
                >
                  Admin Reports
                </button>
              </>
            )}
          </div>
        )}
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
            onRequireLogin={() => setShowLoginModal(true)}
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
          />
        ) : currentUser?.role === 'member' && activeTab === 'my-account' ? (
          <MemberDashboard />
        ) : (currentUser?.role === 'librarian' || currentUser?.role === 'admin') && activeTab === 'librarian-desk' ? (
          <LibrarianDashboard
            onOpenAddBook={() => setShowAddBookModal(true)}
            onGoToCirculation={() => setActiveTab('circulation')}
            onSelectBook={(id) => setSelectedBookId(id)}
          />
        ) : (currentUser?.role === 'librarian' || currentUser?.role === 'admin') && activeTab === 'circulation' ? (
          <CirculationDesk />
        ) : currentUser?.role === 'admin' && activeTab === 'members' ? (
          <MemberManagement />
        ) : currentUser?.role === 'admin' && activeTab === 'reports' ? (
          <ReportsView />
        ) : (
          <CatalogView
            key={refreshTrigger}
            user={currentUser}
            onSelectBook={(id) => setSelectedBookId(id)}
            onOpenAddBook={() => setShowAddBookModal(true)}
          />
        )}
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
