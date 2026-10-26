import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import { 
  Search, 
  Upload, 
  RefreshCw,
  Menu,
  ShieldCheck,
  X
} from 'lucide-react';

export const Header = ({ onOpenUpload, searchQuery, setSearchQuery, onToggleMobileMenu }) => {
  const { customers, leads, dbStatus, auth, adminProfile, updateAdminProfile, syncNow } = useCrm();

  // Admin Profile Edit Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');

  const handleSaveAdminProfile = (e) => {
    e.preventDefault();
    if (!editName.trim()) return;
    updateAdminProfile({
      name: editName.trim(),
      email: editEmail.trim(),
      ...(editPassword.trim() ? { password: editPassword.trim() } : {})
    });
    setShowAdminModal(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-3 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Mobile Hamburger & Search */}
      <div className="flex items-center gap-2 sm:gap-4 flex-1 max-w-md min-w-0">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden shrink-0 cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${customers.length + leads.length} records...`}
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-2">
        {/* Database Status Badge */}
        <div 
          className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            dbStatus?.connected 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}
          title={dbStatus?.message || 'Database status'}
        >
          <span className={`w-2 h-2 rounded-full ${dbStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className="text-[11px] font-bold hidden sm:inline">
            {dbStatus?.connected ? 'Cloudflare R2 Live' : 'Connecting...'}
          </span>
        </div>

        {/* Sync R2 Button */}
        <button
          type="button"
          onClick={() => syncNow()}
          className="flex items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-xs active:scale-95"
          title="Instantly synchronize records from Cloudflare R2"
        >
          <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden md:inline">Sync</span>
        </button>

        {/* Bulk Upload Button (Admin Only) */}
        {auth?.type === 'admin' && (
          <button
            onClick={onOpenUpload}
            className="p-2 sm:px-3.5 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/25 cursor-pointer"
            title="Upload Excel or CSV data"
          >
            <Upload className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Upload</span>
          </button>
        )}

        {/* Vertical Separator */}
        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Avatar / Chip */}
        <div 
          onClick={() => {
            if (auth?.type === 'admin') {
              setEditName(auth.name || '');
              setEditEmail(auth.email || '');
              setEditPassword('');
              setShowAdminModal(true);
            }
          }}
          className={`flex items-center gap-2 p-1.5 rounded-xl transition-all ${
            auth?.type === 'admin' ? 'hover:bg-slate-100 cursor-pointer' : ''
          }`}
          title={auth?.type === 'admin' ? "Click to Edit Admin Profile" : undefined}
        >
          {auth?.avatar ? (
            <img
              src={auth.avatar}
              alt={auth.name}
              className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-slate-800 text-white font-bold flex items-center justify-center text-xs shadow-xs">
              {auth?.name?.substring(0, 2).toUpperCase() || 'AD'}
            </div>
          )}
          <span className="text-xs font-bold text-slate-700 hidden lg:inline max-w-[120px] truncate">
            {auth?.name}
          </span>
        </div>
      </div>

      {/* Admin Profile Settings Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Admin Profile Settings</h3>
                  <p className="text-[11px] text-slate-400">Update your Administrator display name and credentials</p>
                </div>
              </div>
              <button
                onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAdminProfile} className="p-6 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">Administrator Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="e.g. Ghulam Fareed"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
                <p className="text-[10px] text-slate-400">This name will appear on the header and throughout the CRM.</p>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">Admin Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="admin@yourcompany.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-slate-700">New Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password (optional)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
