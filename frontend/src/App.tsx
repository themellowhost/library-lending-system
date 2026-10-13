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

import {
  Apple,
  BookOpen,
  ArrowRightLeft,
  Users,
  BarChart3,
  Bookmark,
  LogIn,
  LogOut,
} from 'lucide-react';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'catalog' | 'circulation' | 'my-account' | 'members' | 'reports'>('catalog');
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);
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
              }}
              className={`hover:text-white transition cursor-pointer ${
                activeTab === 'catalog' ? 'text-white font-semibold' : ''
              }`}
            >
              Catalog
            </button>

            {currentUser?.role === 'member' && (
              <button
                onClick={() => {
                  setActiveTab('my-account');
                  setSelectedBookId(null);
                }}
                className={`hover:text-white transition cursor-pointer ${
                  activeTab === 'my-account' ? 'text-white font-semibold' : ''
                }`}
              >
                My Loans & Holds
              </button>
            )}

            {(currentUser?.role === 'librarian' || currentUser?.role === 'admin') && (
              <>
                <button
                  onClick={() => {
                    setActiveTab('circulation');
                    setSelectedBookId(null);
                  }}
                  className={`hover:text-white transition cursor-pointer ${
                    activeTab === 'circulation' ? 'text-white font-semibold' : ''
                  }`}
                >
                  Circulation Desk
                </button>

                <button
                  onClick={() => {
                    setActiveTab('members');
                    setSelectedBookId(null);
                  }}
                  className={`hover:text-white transition cursor-pointer ${
                    activeTab === 'members' ? 'text-white font-semibold' : ''
                  }`}
                >
                  Members
                </button>

                <button
                  onClick={() => {
                    setActiveTab('reports');
                    setSelectedBookId(null);
                  }}
                  className={`hover:text-white transition cursor-pointer ${
                    activeTab === 'reports' ? 'text-white font-semibold' : ''
                  }`}
                >
                  Analytics & Overdue
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
            }}
            className={`whitespace-nowrap ${activeTab === 'catalog' ? 'text-white font-bold' : ''}`}
          >
            Catalog
          </button>
          {currentUser?.role === 'member' && (
            <button
              onClick={() => {
                setActiveTab('my-account');
                setSelectedBookId(null);
              }}
              className={`whitespace-nowrap ${activeTab === 'my-account' ? 'text-white font-bold' : ''}`}
            >
              My Loans
            </button>
          )}
          {(currentUser?.role === 'librarian' || currentUser?.role === 'admin') && (
            <>
              <button
                onClick={() => {
                  setActiveTab('circulation');
                  setSelectedBookId(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'circulation' ? 'text-white font-bold' : ''}`}
              >
                Circulation
              </button>
              <button
                onClick={() => {
                  setActiveTab('members');
                  setSelectedBookId(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'members' ? 'text-white font-bold' : ''}`}
              >
                Members
              </button>
              <button
                onClick={() => {
                  setActiveTab('reports');
                  setSelectedBookId(null);
                }}
                className={`whitespace-nowrap ${activeTab === 'reports' ? 'text-white font-bold' : ''}`}
              >
                Analytics
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex-1 w-full">
        {selectedBookId !== null ? (
          <BookDetailModal
            bookId={selectedBookId}
            user={currentUser}
            onBack={() => setSelectedBookId(null)}
            onRefresh={triggerRefresh}
          />
        ) : activeTab === 'catalog' ? (
          <CatalogView
            key={refreshTrigger}
            user={currentUser}
            onSelectBook={(id) => setSelectedBookId(id)}
            onOpenAddBook={() => setShowAddBookModal(true)}
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
