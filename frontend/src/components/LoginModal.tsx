import React, { useState } from 'react';
import api from '../api';
import { User } from '../types';
import { MOCK_USERS } from '../mockData';
import { X, Sparkles, ShieldAlert, ArrowRight, Loader2, Check, UserPlus, LogIn, Mail, Lock, User as UserIcon, Phone } from 'lucide-react';

interface LoginModalProps {
  onSuccess: (user: User) => void;
  onClose: () => void;
  initialMode?: 'signin' | 'register';
}

export const LoginModal: React.FC<LoginModalProps> = ({ onSuccess, onClose, initialMode = 'signin' }) => {
  const [mode, setMode] = useState<'signin' | 'register'>(initialMode);
  
  // Shared Form Fields
  const [email, setEmail] = useState(initialMode === 'register' ? '' : 'librarian@library.edu');
  const [password, setPassword] = useState(initialMode === 'register' ? '' : 'password123');

  // Register Fields
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');

  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<'apple' | 'google' | null>(null);

  // Switch between Sign In and Register modes
  const handleSwitchMode = (newMode: 'signin' | 'register') => {
    setMode(newMode);
    setError('');
    setSuccessMsg('');
    if (newMode === 'register') {
      setEmail('');
      setPassword('');
      setName('');
      setConfirmPassword('');
      setPhone('');
    } else {
      setEmail('librarian@library.edu');
      setPassword('password123');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      // 1. Attempt API server authentication first
      const res = await api.post('/auth/login', { email: cleanEmail, password: cleanPassword });
      if (res && res.data && res.data.user) {
        localStorage.setItem('library_token', res.data.token || 'library-token-valid');
        localStorage.setItem('library_user', JSON.stringify(res.data.user));
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => onSuccess(res.data.user), 350);
        return;
      }
    } catch (err: any) {
      console.warn('Backend login route not reachable, checking local mock store…', err);
    }

    // 2. Direct client-side verification fallback (ensures GitHub Pages / offline mode works with 100% reliability)
    const foundUser = MOCK_USERS.find(
      (u) => u.email.toLowerCase() === cleanEmail && (u.password === cleanPassword || cleanPassword === 'password123')
    );

    if (foundUser) {
      const { password: _, ...safeUser } = foundUser;
      const mockToken = `session-jwt-${foundUser.id}-${Date.now()}`;
      localStorage.setItem('library_token', mockToken);
      localStorage.setItem('library_user', JSON.stringify(safeUser));
      setLoading(false);
      setSuccessMsg('Signed in successfully!');
      setTimeout(() => onSuccess(safeUser), 350);
      return;
    }

    // Allow any demo institutional email with password123 as a new member
    if (cleanPassword === 'password123' && cleanEmail.includes('@')) {
      const fallbackMember: User = {
        id: 999,
        email: cleanEmail,
        name: cleanEmail.split('@')[0].replace('.', ' ').replace(/^\w/, (c) => c.toUpperCase()),
        role: 'member',
        memberId: 99,
        memberNumber: 'MEM-AUTO-01',
        memberStatus: 'active',
      };
      localStorage.setItem('library_token', `session-jwt-custom-${Date.now()}`);
      localStorage.setItem('library_user', JSON.stringify(fallbackMember));
      setLoading(false);
      setSuccessMsg('Signed in successfully!');
      setTimeout(() => onSuccess(fallbackMember), 350);
      return;
    }

    setError('Invalid email or password. Use password123 for demo accounts or create a new account.');
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();

    if (!cleanName || cleanName.length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please provide a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify.');
      return;
    }

    setLoading(true);

    try {
      // 1. Attempt live API server registration
      const res = await api.post('/auth/register', {
        name: cleanName,
        email: cleanEmail,
        password,
        phone: cleanPhone || undefined,
      });

      if (res && res.data && res.data.user) {
        localStorage.setItem('library_token', res.data.token || 'library-token-valid');
        localStorage.setItem('library_user', JSON.stringify(res.data.user));
        setSuccessMsg(res.data.message || 'Account created successfully! Redirecting…');
        setTimeout(() => onSuccess(res.data.user), 600);
        return;
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message;
      if (err.response?.status === 409) {
        setError(errorMsg || 'An account with this email already exists. Please sign in.');
        setLoading(false);
        return;
      }
      console.warn('Backend register not reachable, registering via client runtime engine…', err);
    }

    // 2. Direct client-side registration fallback (for GitHub Pages & offline demo mode)
    const newId = 100 + MOCK_USERS.length + 1;
    const memberNum = `MEM-${String(100 + newId).padStart(5, '0')}`;
    const newMember: User = {
      id: newId,
      email: cleanEmail,
      name: cleanName,
      role: 'member',
      memberId: newId,
      memberNumber: memberNum,
      memberStatus: 'active',
    };

    MOCK_USERS.push({
      ...newMember,
      password,
    });

    localStorage.setItem('library_token', `session-jwt-reg-${newId}-${Date.now()}`);
    localStorage.setItem('library_user', JSON.stringify(newMember));
    setLoading(false);
    setSuccessMsg('Account created successfully! Welcome to LiberFlow.');
    setTimeout(() => onSuccess(newMember), 600);
  };

  const handleOAuthLogin = async (provider: 'apple' | 'google') => {
    setError('');
    setSuccessMsg('');
    setOauthLoading(provider);

    try {
      // Simulate OAuth authorization popup / handshake latency
      await new Promise((r) => setTimeout(r, 450));

      const defaultName = provider === 'apple' ? 'Apple Verified Scholar' : 'Google Workspace Researcher';
      const defaultEmail = provider === 'apple' ? 'scholar.apple@icloud.com' : 'researcher.google@gmail.com';

      // 1. Attempt backend oauth endpoint
      try {
        const res = await api.post('/auth/oauth', {
          provider,
          email: defaultEmail,
          name: defaultName,
        });

        if (res && res.data && res.data.user) {
          localStorage.setItem('library_token', res.data.token || 'oauth-token-valid');
          localStorage.setItem('library_user', JSON.stringify(res.data.user));
          setOauthLoading(null);
          setSuccessMsg(`Signed in with ${provider === 'apple' ? 'Apple' : 'Google'}!`);
          setTimeout(() => onSuccess(res.data.user), 350);
          return;
        }
      } catch (e) {
        // Fall through to client mock resolution
      }

      // 2. Direct client-side session resolution for GitHub Pages / static hosting
      const oauthUser: User = {
        id: provider === 'apple' ? 881 : 882,
        email: defaultEmail,
        name: defaultName,
        role: 'member',
        memberId: provider === 'apple' ? 81 : 82,
        memberNumber: provider === 'apple' ? 'MEM-AAPL-01' : 'MEM-GOOG-01',
        memberStatus: 'active',
      };

      const oauthToken = `oauth-jwt-${provider}-${Date.now()}`;
      localStorage.setItem('library_token', oauthToken);
      localStorage.setItem('library_user', JSON.stringify(oauthUser));
      setOauthLoading(null);
      setSuccessMsg(`Signed in with ${provider === 'apple' ? 'Apple' : 'Google'}!`);
      setTimeout(() => onSuccess(oauthUser), 350);
    } catch (err: any) {
      console.error(`OAuth login failed with ${provider}`, err);
      setError(`Failed to sign in with ${provider}`);
      setOauthLoading(null);
    }
  };

  const setDemoAccount = (demoEmail: string) => {
    handleSwitchMode('signin');
    setEmail(demoEmail);
    setPassword('password123');
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="relative bg-[#1c1c1e] rounded-[28px] shadow-2xl max-w-md w-full border border-white/10 overflow-hidden text-[#f5f5f7] max-h-[92vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pt-8 overflow-y-auto">
          {/* Logo badge & Header */}
          <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0071e3] to-[#42a5f5] mx-auto mb-3 flex items-center justify-center shadow-lg shadow-blue-500/20">
              {mode === 'signin' ? (
                <Sparkles className="w-6 h-6 text-white" />
              ) : (
                <UserPlus className="w-6 h-6 text-white" />
              )}
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white">
              {mode === 'signin' ? 'Sign In to LiberFlow' : 'Create an Account'}
            </h2>
            <p className="text-xs text-[#86868b] mt-1">
              {mode === 'signin'
                ? 'Access catalog circulation, reserves & digital loans'
                : 'Register as an institutional member with instant borrowing privileges'}
            </p>

            {/* Segmented Control Pill */}
            <div className="inline-flex p-1 rounded-full bg-[#2c2c2e] border border-white/10 mt-5 mb-2">
              <button
                type="button"
                onClick={() => handleSwitchMode('signin')}
                className={`px-5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  mode === 'signin'
                    ? 'bg-[#0071e3] text-white shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleSwitchMode('register')}
                className={`px-5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                  mode === 'register'
                    ? 'bg-[#0071e3] text-white shadow-md'
                    : 'text-[#86868b] hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                Create Account
              </button>
            </div>
          </div>

          {/* Social OAuth Providers (Apple / Google) */}
          <div className="mt-4 space-y-2">
            {/* Sign in with Apple */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('apple')}
              disabled={loading || oauthLoading !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-white text-black font-semibold text-xs flex items-center justify-center gap-2 hover:bg-white/90 active:scale-[0.99] transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {oauthLoading === 'apple' ? (
                <Loader2 className="w-4 h-4 animate-spin text-black" />
              ) : (
                <svg className="w-4 h-4 shrink-0 fill-current" viewBox="0 0 170 170">
                  <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.67-7.85-11.96-14.43-5.74-8.8-10.23-18.78-13.48-29.93-3.25-11.16-4.88-21.75-4.88-31.78 0-14.15 3.4-25.96 10.2-35.43 6.8-9.47 15.42-14.28 25.86-14.43 4.9.12 10.23 1.33 16 3.65 5.76 2.31 9.4 3.53 10.92 3.65 2.29-.37 6.4-1.74 12.33-4.11 5.93-2.38 11.09-3.41 15.48-3.1 11.51.87 20.89 5.38 28.15 13.53-9.98 6.07-14.86 14.54-14.65 25.42.22 8.46 3.44 15.64 9.68 21.54 6.23 5.9 13.78 9.24 22.65 10.02-2.17 6.3-4.91 12.87-8.22 19.72zM119.22 31.84c0-7.39 2.68-14.43 8.04-21.11 5.37-6.68 11.96-10.73 19.77-12.16.22 1.31.33 2.5.33 3.58 0 7.4-2.82 14.48-8.47 21.23-5.65 6.75-12.21 10.66-19.67 11.73v-3.27z" />
                </svg>
              )}
              <span>Continue with Apple</span>
            </button>

            {/* Sign in with Google */}
            <button
              type="button"
              onClick={() => handleOAuthLogin('google')}
              disabled={loading || oauthLoading !== null}
              className="w-full py-2.5 px-4 rounded-xl bg-[#2c2c2e] hover:bg-[#3a3a3c] border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-2 active:scale-[0.99] transition cursor-pointer shadow-md disabled:opacity-50"
            >
              {oauthLoading === 'google' ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-white/10 flex-1" />
            <span className="text-[11px] uppercase tracking-wider text-[#86868b] font-medium">
              or with email
            </span>
            <div className="h-px bg-white/10 flex-1" />
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2.5 text-red-400 text-xs">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2.5 text-green-400 text-xs">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FORM: Sign In */}
          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3.5 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full mt-2 py-3 px-6 apple-pill-btn text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15 disabled:opacity-50"
              >
                <span>{loading ? 'Authenticating…' : 'Sign In with Email'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* FORM: Create Account */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3 text-left">
              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1 ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1 ml-1">
                  Institutional / Personal Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="elena@university.edu"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1 ml-1">
                  Phone Number <span className="text-white/40 normal-case">(optional)</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#86868b] absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1 ml-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#86868b] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 chars"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1 ml-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#86868b] absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-xs sm:text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:border-transparent transition"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-[11px] text-blue-300">
                ✨ Account includes <strong>5 concurrent book loans</strong>, online reservation holds, and access to all open digital editions.
              </div>

              <button
                type="submit"
                disabled={loading || oauthLoading !== null}
                className="w-full mt-2 py-3 px-6 apple-pill-btn text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-blue-500/15 disabled:opacity-50"
              >
                <span>{loading ? 'Creating Member Account…' : 'Register Member Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Footer toggle prompt */}
          <div className="mt-4 text-center">
            {mode === 'signin' ? (
              <p className="text-xs text-[#86868b]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('register')}
                  className="text-[#2997ff] hover:underline font-semibold cursor-pointer"
                >
                  Create one now
                </button>
              </p>
            ) : (
              <p className="text-xs text-[#86868b]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleSwitchMode('signin')}
                  className="text-[#2997ff] hover:underline font-semibold cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Quick Demo Switchers (visible in signin mode) */}
          {mode === 'signin' && (
            <div className="mt-5 pt-4 border-t border-white/10">
              <p className="text-[11px] text-[#86868b] font-medium mb-2.5 text-center">
                Instant Demo Access (password123):
              </p>
              <div className="flex flex-wrap gap-2 justify-center text-[11px]">
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
                  Alex (Member)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('priya@student.edu')}
                  className="px-3 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-full font-medium transition cursor-pointer"
                >
                  Priya (Overdue)
                </button>
                <button
                  type="button"
                  onClick={() => setDemoAccount('admin@library.edu')}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 rounded-full font-medium transition cursor-pointer"
                >
                  Admin
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
