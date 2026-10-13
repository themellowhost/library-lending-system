import React, { useState } from 'react';
import api from '../api';
import { User } from '../types';
import { X, Sparkles, ShieldAlert, ArrowRight } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: User) => void;
  onClose: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState('librarian@library.edu');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('library_token', res.data.token);
      localStorage.setItem('library_user', JSON.stringify(res.data.user));
      onSuccess(res.data.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="relative bg-[#1d1d1f] rounded-[24px] shadow-2xl max-w-md w-full border border-white/10 overflow-hidden text-[#f5f5f7]">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pt-10 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#42a5f5] mx-auto mb-4 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-white">Sign In with Apple ID</h2>
          <p className="text-sm text-[#86868b] mt-1">Access the LiberFlow lending network</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4 text-left">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-400 text-xs">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.edu"
                className="w-full px-4 py-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-6 apple-pill-btn text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating…' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switchers */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-[#86868b] font-medium mb-3">Quick Demo Passkey (password: password123):</p>
            <div className="flex flex-wrap gap-2 justify-center text-xs">
              <button
                type="button"
                onClick={() => setDemoAccount('librarian@library.edu')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full font-medium transition cursor-pointer text-white/90"
              >
                Librarian Desk
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('alex@student.edu')}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full font-medium transition cursor-pointer text-white/90"
              >
                Alex (Active Member)
              </button>
              <button
                type="button"
                onClick={() => setDemoAccount('priya@student.edu')}
                className="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-full font-medium transition cursor-pointer"
              >
                Priya (Overdue Member)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
