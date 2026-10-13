import React, { useEffect, useState } from 'react';
import api from '../api';
import { Member } from '../types';
import { Users, UserPlus, Check, ArrowRight } from 'lucide-react';

export const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [maxLoans, setMaxLoans] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get('/members');
      setMembers(res.data);
    } catch (err) {
      console.error('Failed to load members', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    try {
      const res = await api.post('/members', {
        name,
        email,
        phone,
        maxLoans: Number(maxLoans),
      });

      setFormSuccess(`Registered ${res.data.member.name} (${res.data.member.memberNumber})`);
      setName('');
      setEmail('');
      setPhone('');
      setShowAddForm(false);
      loadMembers();
    } catch (err: any) {
      setFormError(err.response?.data?.error || 'Registration failed');
    }
  };

  const handleToggleStatus = async (memberId: number, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      await api.patch(`/members/${memberId}/status`, { status: nextStatus });
      loadMembers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update member status');
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Member Management
          </h1>
          <p className="text-sm text-[#86868b] mt-1">
            Enroll library members, adjust borrowing quotas, and toggle account states.
          </p>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="apple-pill-btn px-6 py-2.5 text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
        >
          <UserPlus className="w-3.5 h-3.5" />
          {showAddForm ? 'Cancel' : 'Register Member'}
        </button>
      </div>

      {formSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4" /> {formSuccess}
        </div>
      )}

      {/* Registration Form Drawer */}
      {showAddForm && (
        <form onSubmit={handleRegister} className="apple-card p-8 border-white/20 space-y-6">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-[#2997ff]" /> Member Account Enrollment
          </h3>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">{formError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jordan Miller"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jordan@student.edu"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1-555-0199"
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#86868b] uppercase tracking-wider mb-1.5 ml-1">
                Max Active Loan Limit
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={maxLoans}
                onChange={(e) => setMaxLoans(Number(e.target.value))}
                className="w-full px-4 py-2.5 bg-[#2c2c2e] border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#0071e3]"
              />
            </div>
          </div>

          <button
            type="submit"
            className="apple-pill-btn px-6 py-2.5 text-xs font-semibold cursor-pointer shadow-md"
          >
            Create Member & Generate ID
          </button>
        </form>
      )}

      {/* Members Table */}
      <div className="apple-card p-8">
        <h2 className="text-lg font-bold text-white mb-6">Directory ({members.length} Enrolled)</h2>

        {loading ? (
          <div className="text-center py-16 text-[#86868b] text-xs animate-pulse">Loading member records…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-[11px] font-semibold uppercase tracking-wider text-[#86868b] border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">Member ID</th>
                  <th className="py-3 px-4">Borrower Name & Email</th>
                  <th className="py-3 px-4">Loans / Quota</th>
                  <th className="py-3 px-4">Account Status</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 px-4 font-mono font-medium text-xs text-[#86868b]">{m.member_number}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-white">{m.name}</div>
                      <div className="text-xs text-[#86868b]">{m.email}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-semibold text-white">{m.active_loans_count}</span>
                      <span className="text-[#86868b] text-xs"> / {m.max_loans}</span>
                      {m.overdue_loans_count > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500/20 text-red-300 rounded-full text-[10px] font-bold border border-red-500/30">
                          {m.overdue_loans_count} overdue
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {m.status === 'active' && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-medium">
                          Active
                        </span>
                      )}
                      {m.status === 'suspended' && (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggleStatus(m.id, m.status)}
                        className={`text-xs font-semibold cursor-pointer transition ${
                          m.status === 'active'
                            ? 'text-red-400 hover:text-red-300'
                            : 'text-emerald-400 hover:text-emerald-300'
                        }`}
                      >
                        {m.status === 'active' ? 'Suspend' : 'Reactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
