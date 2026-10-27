import React, { useState, useEffect } from 'react';
import { useCrm } from '../context/CrmContext';
import { BUSINESS_CATEGORIES } from '../utils/categoryUtils';
import { 
  X, 
  UserPlus, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  UserCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Loader2
} from 'lucide-react';

const PAKISTANI_CITIES = [
  'Karachi',
  'Lahore',
  'Islamabad',
  'Rawalpindi',
  'Faisalabad',
  'Multan',
  'Peshawar',
  'Sialkot',
  'Gujranwala',
  'Hyderabad',
  'Quetta',
  'Other'
];

export const AddLeadModal = ({ isOpen, onClose }) => {
  const { auth, agents, addLead, statusConfig } = useCrm();

  const isAgent = auth?.type === 'agent';
  const defaultAgent = isAgent ? auth?.name : (agents[0]?.name || 'Admin');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    category: 'General Business',
    city: 'Karachi',
    customCity: '',
    assignedAgent: defaultAgent,
    status: 'Pending',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        phone: '',
        email: '',
        category: 'General Business',
        city: 'Karachi',
        customCity: '',
        assignedAgent: isAgent ? auth?.name : (agents[0]?.name || 'Admin'),
        status: 'Pending',
        notes: ''
      });
      setErrorMessage('');
      setIsSubmitting(false);
    }
  }, [isOpen, isAgent, auth, agents]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage('Lead or Business name is required.');
      return;
    }

    if (!formData.phone.trim()) {
      setErrorMessage('Valid phone number is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    const resolvedCity = formData.city === 'Other' 
      ? (formData.customCity.trim() || 'Other') 
      : formData.city;

    const payload = {
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      category: formData.category,
      city: resolvedCity,
      assignedAgent: isAgent ? auth.name : formData.assignedAgent,
      status: formData.status,
      notes: formData.notes.trim() || `Lead directly entered by ${auth?.name || 'team member'}.`,
      source: 'Direct Team Entry'
    };

    try {
      const result = await addLead(payload);
      if (result) {
        onClose();
      } else {
        setErrorMessage('Failed to save lead. Please check network connection.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while saving lead');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Add New Lead</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Direct Entry
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAgent 
                  ? `Entering lead into your personal pipeline (${auth?.name})` 
                  : 'Add lead directly to the pipeline & assign to team member'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert if any */}
        {errorMessage && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* 1. Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lead / Business Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Al-Madina Textile / Dr. Ahmed"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Phone Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567 or 923001234567"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Email & Business Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Email Address <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="contact@example.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Business Category / Industry
              </label>
              <div className="relative">
                <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer font-medium"
                >
                  {BUSINESS_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({cat.timings})
                    </option>
                  ))}
                  <option value="General Business">General Business (Standard Hours)</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. City & Initial Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                City / Location
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer"
                >
                  {PAKISTANI_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {formData.city === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify city name"
                  value={formData.customCity}
                  onChange={(e) => handleChange('customCity', e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Initial Lead Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer font-semibold"
              >
                <option value="Pending">⏳ Pending (Awaiting Call)</option>
                <option value="Connected">📞 Connected (In Discussion)</option>
                <option value="Not Connected">❌ Not Connected (Missed / Busy)</option>
                <option value="Interested">🔥 Interested (Hot Lead)</option>
                <option value="Not Interested">🚫 Not Interested (Closed)</option>
                <option value="Not on WhatsApp">📵 Not on WhatsApp</option>
              </select>
            </div>
          </div>

          {/* 4. Assigned Team Member */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Assigned Team Member
            </label>
            {isAgent ? (
              <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <div className="text-xs">
                  <span className="font-bold text-blue-900">{auth?.name}</span>
                  <span className="text-blue-600 ml-1.5 font-medium">(Assigned directly to your pipeline)</span>
                </div>
              </div>
            ) : (
              <div className="relative">
                <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={formData.assignedAgent}
                  onChange={(e) => handleChange('assignedAgent', e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all appearance-none cursor-pointer font-medium"
                >
                  <option value={auth?.name || 'Admin'}>{auth?.name || 'Admin'} (Self)</option>
                  {agents.map(ag => (
                    <option key={ag.id || ag.name} value={ag.name}>
                      {ag.name} {ag.role ? `(${ag.role})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 5. Notes / Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Remarks / Initial Discussion Notes
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={3}
                placeholder="e.g. Lead met at trade show. Interested in bulk order. Follow-up tomorrow 3 PM."
                value={formData.notes}
                onChange={(e) => handleChange('notes', e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all resize-none"
              />
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/30 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving to R2...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Save Lead to Pipeline</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
