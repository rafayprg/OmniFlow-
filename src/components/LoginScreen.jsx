import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { 
  ShieldCheck, 
  KeyRound, 
  Users2, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  ArrowRightLeft,
  Settings2,
  RefreshCw
} from 'lucide-react';

export const LoginScreen = () => {
  const { agents, loginAdmin, loginAgentPin, dbStatus, syncNow } = useCrm();

  // Active Mode: 'admin' | 'agent'
  const [activeMode, setActiveMode] = useState('admin');

  // Admin form state: completely empty by default for security
  const [isAdminSetupMode, setIsAdminSetupMode] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Agent PIN form state
  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || '');
  const [agentPin, setAgentPin] = useState('');
  const [showAgentPin, setShowAgentPin] = useState(false);

  // Keep selectedAgentId synced if agents change
  useEffect(() => {
    if (agents.length > 0 && (!selectedAgentId || !agents.find(a => String(a.id) === String(selectedAgentId)))) {
      setSelectedAgentId(agents[0].id);
    }
  }, [agents, selectedAgentId]);

  // Error feedback
  const [errorMsg, setErrorMsg] = useState('');

  const selectedAgent = agents.find(a => String(a.id) === String(selectedAgentId)) || agents[0];

  // Submit Admin Login
  const handleAdminSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    if (isAdminSetupMode && !adminName.trim()) {
      setErrorMsg('Please enter your full name as Administrator.');
      return;
    }

    if (!adminEmail.trim()) {
      setErrorMsg('Please enter your administrator ID or email address.');
      return;
    }

    if (!adminPassword.trim()) {
      setErrorMsg('Please enter your administrator password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await loginAdmin({
        name: adminName.trim(),
        email: adminEmail.trim(),
        id: adminEmail.trim(),
        password: adminPassword.trim()
      });

      if (res && !res.success) {
        setErrorMsg(res.message || 'Authentication failed. Please check your credentials.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Agent PIN Login
  const handleAgentSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedAgent) {
      setErrorMsg('Please select your team member profile.');
      return;
    }

    if (!agentPin.trim()) {
      setErrorMsg(`Please enter the security PIN assigned to ${selectedAgent.name}.`);
      return;
    }

    const res = loginAgentPin(selectedAgent.id, agentPin.trim());
    if (res && !res.success) {
      setErrorMsg(res.message || `Incorrect PIN for ${selectedAgent.name}. Please enter the exact PIN assigned by your Administrator.`);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans text-slate-100 relative overflow-hidden select-none">
      {/* Background Decorative Glow */}
      <div className="absolute top-1/4 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Branding */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">OmniFlow</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 uppercase tracking-wider">
                CRM Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Production Lead & Team Operations</p>
          </div>
        </div>

        {/* Sync & Cloud Status Chip */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => syncNow()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-xs text-blue-300 transition-all cursor-pointer"
            title="Fetch Latest Data from Cloudflare R2"
          >
            <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
            <span className="text-[11px] font-semibold">Sync R2</span>
          </button>

          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs">
            <span className={`w-2 h-2 rounded-full ${dbStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-slate-300 text-[11px] font-semibold">
              {dbStatus?.connected ? 'Cloudflare R2 Live' : 'Connecting to R2...'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Authentication Card */}
      <main className="max-w-md w-full mx-auto my-auto py-8 z-10">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
          
          {/* Portal Selector Tabs */}
          <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
            <button
              type="button"
              onClick={() => { setActiveMode('admin'); setErrorMsg(''); }}
              className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'admin'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Admin Portal</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveMode('agent'); setErrorMsg(''); }}
              className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'agent'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Team PIN Login</span>
            </button>
          </div>

          {/* Heading */}
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {activeMode === 'admin' 
                ? (isAdminSetupMode ? 'Create Administrator Account' : 'Administrator Sign In') 
                : 'Team Member PIN Portal'}
            </h2>
            <p className="text-xs text-slate-400">
              {activeMode === 'admin'
                ? (isAdminSetupMode 
                    ? 'Configure your administrator profile and credentials.' 
                    : 'Sign in with your administrator email and password.')
                : 'Select your team member profile and enter your private PIN assigned by Admin.'}
            </p>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. ADMIN LOGIN & SETUP FORM */}
          {activeMode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              {/* Admin Full Name (Shown in Setup / Edit Mode) */}
              {isAdminSetupMode && (
                <div className="space-y-1.5 animate-in fade-in">
                  <label className="text-xs font-semibold text-slate-300">
                    Your Full Name (Administrator) <span className="text-blue-400">*</span>
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                      placeholder="e.g. Sales Administrator"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      required
                      autoFocus
                    />
                  </div>
                </div>
              )}

              {/* Admin ID / Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  Admin Email / ID <span className="text-blue-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="sales@techdeva.net"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                </div>
              </div>

              {/* Admin Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">
                    Admin Password <span className="text-blue-400">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showAdminPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-xs shadow-lg shadow-blue-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-blue-400/30 mt-2"
              >
                <span>{isSubmitting ? 'Authenticating...' : (isAdminSetupMode ? 'Create Admin Profile & Enter' : 'Sign In as Admin')}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Quick Fill Demo Credentials */}
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center space-y-1">
                <p className="text-[10px] text-slate-400">Default Admin Credentials:</p>
                <button
                  type="button"
                  onClick={() => {
                    setAdminEmail('sales@techdeva.net');
                    setAdminPassword('Techdeva@12');
                  }}
                  className="w-full py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>⚡ 1-Click Fill: sales@techdeva.net / Techdeva@12</span>
                </button>
              </div>

              {/* Toggle Setup / Edit Mode */}
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsAdminSetupMode(!isAdminSetupMode);
                    setErrorMsg('');
                  }}
                  className="text-[11px] font-semibold text-slate-400 hover:text-blue-300 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Settings2 className="w-3.5 h-3.5" />
                  <span>
                    {isAdminSetupMode 
                      ? 'Already have an Admin account? Sign In' 
                      : 'Change Admin Name or Reset Password'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* 2. TEAM MEMBER PIN LOGIN FORM */}
          {activeMode === 'agent' && (
            <div>
              {agents.length === 0 ? (
                /* Empty state when Admin hasn't added any agents yet */
                <div className="py-6 text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 mx-auto flex items-center justify-center">
                    <Users2 className="w-7 h-7 text-indigo-400" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-sm font-bold text-white">No Team Members Added Yet</h3>
                    <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                      Please log in as Administrator to add your sales representatives and assign each member their unique security PIN.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveMode('admin')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>Go to Admin Portal</span>
                  </button>
                </div>
              ) : (
                /* Real Team Members PIN Form */
                <form onSubmit={handleAgentSubmit} className="space-y-4">
                  {/* Select Team Member Dropdown */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">Select Team Member Profile</label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => {
                        setSelectedAgentId(Number(e.target.value));
                        setAgentPin('');
                        setErrorMsg('');
                      }}
                      className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-700/80 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {agents.map((agent) => (
                        <option key={agent.id} value={agent.id} className="bg-slate-900 text-white">
                          {agent.name} {agent.role ? `— (${agent.role})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Agent Preview */}
                  {selectedAgent && (
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={selectedAgent.avatar}
                          alt={selectedAgent.name}
                          className="w-10 h-10 rounded-full object-cover ring-2 ring-indigo-500/30"
                        />
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">{selectedAgent.name}</p>
                          <p className="text-[10px] text-indigo-300">{selectedAgent.role || 'Sales Representative'}</p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 font-semibold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>PIN Required</span>
                      </span>
                    </div>
                  )}

                  {/* Security PIN Input */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      Enter Your Security PIN
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showAgentPin ? 'text' : 'password'}
                        maxLength={8}
                        value={agentPin}
                        onChange={(e) => setAgentPin(e.target.value.replace(/\D/g, ''))}
                        placeholder="••••"
                        className="w-full pl-10 pr-10 py-3 bg-slate-950/60 border border-slate-700/80 rounded-xl text-center font-mono tracking-widest text-lg font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        required
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowAgentPin(!showAgentPin)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        {showAgentPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 text-center">
                      Please enter the security PIN assigned to you by your Administrator.
                    </p>
                  </div>

                  {/* Quick Select Agent Chips */}
                  {agents.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[10px] text-slate-400 text-center">Quick 1-Tap Agent Select:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {agents.map(a => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => {
                              setSelectedAgentId(Number(a.id));
                              setAgentPin(a.pin || '1234');
                            }}
                            className={`py-1.5 px-1.5 rounded-xl text-[11px] font-semibold border transition-all cursor-pointer text-center ${
                              Number(selectedAgentId) === Number(a.id)
                                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-xs'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <span className="block truncate font-bold">{a.name}</span>
                            <span className="block text-[9px] text-indigo-400 font-mono">PIN: {a.pin || '1234'}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer border border-indigo-400/30"
                  >
                    <span>Unlock {selectedAgent?.name || 'Member'} Portal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="pt-2 text-center">
                    <p className="text-[10px] text-slate-400">
                      Forgot your PIN? Contact your Administrator to re-assign your PIN in Team Settings.
                    </p>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Clean Minimal Footer */}
      <footer className="text-center text-[11px] text-slate-500 py-3 z-10">
        <p>OmniFlow CRM • Secure Cloud Portal</p>
      </footer>
    </div>
  );
};
