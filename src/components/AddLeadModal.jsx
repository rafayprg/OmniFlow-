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
  UserCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Globe, 
  Share2, 
  Star, 
  User 
} from 'lucide-react';
import { 
  TikTokIcon, 
  InstagramIcon, 
  LinkedInIcon, 
  FacebookIcon, 
  TwitterIcon 
} from '../utils/socialUtils';

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
  const { auth, agents, addLead } = useCrm();

  const isAgent = auth?.type === 'agent';
  const defaultAgent = isAgent ? auth?.name : (agents[0]?.name || 'Admin');

  const [formData, setFormData] = useState({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    category: 'General Business',
    industry: 'General Business',
    address: '',
    city: 'Karachi',
    customCity: '',
    assignedAgent: defaultAgent,
    status: 'Pending',
    website: '',
    instagram: '',
    facebook: '',
    tiktok: '',
    linkedin: '',
    youtube: '',
    twitter: '',
    rating: '',
    reviewCount: '',
    reviews: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset form when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        category: 'General Business',
        industry: 'General Business',
        address: '',
        city: 'Karachi',
        customCity: '',
        assignedAgent: isAgent ? auth?.name : (agents[0]?.name || 'Admin'),
        status: 'Pending',
        website: '',
        instagram: '',
        facebook: '',
        tiktok: '',
        linkedin: '',
        youtube: '',
        twitter: '',
        rating: '',
        reviewCount: '',
        reviews: '',
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
    setFormData(prev => ({ 
      ...prev, 
      [field]: value,
      ...(field === 'category' ? { industry: value } : {})
    }));
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
      // 1. Business Name
      name: formData.name.trim(),
      contactPerson: formData.contactPerson.trim(),
      // 2. Contact
      phone: formData.phone.trim(),
      email: formData.email.trim(),
      // 3. Address
      address: formData.address.trim(),
      city: resolvedCity,
      // 4. Industry
      category: formData.category,
      industry: formData.category,
      // 5 & 6. Website & Socials
      website: formData.website.trim(),
      instagram: formData.instagram.trim(),
      facebook: formData.facebook.trim(),
      tiktok: formData.tiktok.trim(),
      linkedin: formData.linkedin.trim(),
      youtube: formData.youtube.trim(),
      twitter: formData.twitter.trim(),
      // 7. Reviews
      rating: formData.rating ? Number(formData.rating) : null,
      reviewCount: formData.reviewCount ? Number(formData.reviewCount) : null,
      reviews: formData.reviews.trim(),
      // Management
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-800">
                Add New Lead (The 7 Sections)
              </h3>
              <p className="text-xs text-slate-500">
                Directly enter a lead with Business, Contact, Address, Industry, Socials, Website, and Reviews.
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* 1. Name & Contact Person */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🏢 Business / Company Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. Apex Global Traders / Dr. Bilal"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                👤 Contact Person / Owner Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Tariq Mehmood"
                  value={formData.contactPerson}
                  onChange={(e) => handleChange('contactPerson', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* 2. Contact: Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                📞 Phone Number (WhatsApp) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. 03001234567 or +92 300 1234567"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-mono font-semibold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                ✉️ Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="contact@business.com"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* 3. Address & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                📍 Full Street Address
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Plot 14-C, Shahrah-e-Faisal"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🏙️ City
              </label>
              <select
                value={formData.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-medium"
              >
                {PAKISTANI_CITIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {formData.city === 'Other' && (
                <input
                  type="text"
                  placeholder="Type city name"
                  value={formData.customCity}
                  onChange={(e) => handleChange('customCity', e.target.value)}
                  className="w-full mt-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                />
              )}
            </div>
          </div>

          {/* 4. Industry & Assigned Agent */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                🏭 Industry / Business Type
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-medium"
              >
                {BUSINESS_CATEGORIES.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label} ({cat.timings})
                  </option>
                ))}
                <option value="General Business">General Business (Standard Hours)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                👤 Assigned Team Member
              </label>
              {isAgent ? (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-xl text-xs font-bold text-blue-900">
                  <UserCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>{auth?.name} (Assigned to your pipeline)</span>
                </div>
              ) : (
                <select
                  value={formData.assignedAgent}
                  onChange={(e) => handleChange('assignedAgent', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all font-medium"
                >
                  <option value={auth?.name || 'Admin'}>{auth?.name || 'Admin'} (Self)</option>
                  {agents.map(ag => (
                    <option key={ag.id || ag.name} value={ag.name}>
                      {ag.name} {ag.role ? `(${ag.role})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 5 & 6. WEBSITE & SOCIALS */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <Share2 className="w-3.5 h-3.5 text-blue-600" />
              <span>5 & 6. Website & Social Media Channels</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Website */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <Globe className="w-3 h-3 text-blue-600" />
                  <span>Website URL</span>
                </label>
                <input
                  type="text"
                  placeholder="https://example.com"
                  value={formData.website}
                  onChange={(e) => handleChange('website', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {/* Instagram */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <InstagramIcon className="w-3 h-3 text-pink-600" />
                  <span>Instagram</span>
                </label>
                <input
                  type="text"
                  placeholder="@handle or URL"
                  value={formData.instagram}
                  onChange={(e) => handleChange('instagram', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              {/* Facebook */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <FacebookIcon className="w-3 h-3 text-indigo-600" />
                  <span>Facebook</span>
                </label>
                <input
                  type="text"
                  placeholder="fb.com/page or URL"
                  value={formData.facebook}
                  onChange={(e) => handleChange('facebook', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              {/* LinkedIn */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <LinkedInIcon className="w-3 h-3 text-sky-600" />
                  <span>LinkedIn</span>
                </label>
                <input
                  type="text"
                  placeholder="company/profile URL"
                  value={formData.linkedin}
                  onChange={(e) => handleChange('linkedin', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              {/* TikTok */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <TikTokIcon className="w-3 h-3 text-slate-900" />
                  <span>TikTok</span>
                </label>
                <input
                  type="text"
                  placeholder="@handle"
                  value={formData.tiktok}
                  onChange={(e) => handleChange('tiktok', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

              {/* Twitter / X */}
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                  <TwitterIcon className="w-3 h-3 text-slate-800" />
                  <span>Twitter / X</span>
                </label>
                <input
                  type="text"
                  placeholder="@handle or URL"
                  value={formData.twitter}
                  onChange={(e) => handleChange('twitter', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>
            </div>
          </div>

          {/* 7. REVIEWS & REPUTATION */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
              <span>7. Reviews & Reputation</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  ⭐ Rating Score (1.0 - 5.0)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  placeholder="e.g. 4.8"
                  value={formData.rating}
                  onChange={(e) => handleChange('rating', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  💬 Total Reviews Count
                </label>
                <input
                  type="number"
                  placeholder="e.g. 142"
                  value={formData.reviewCount}
                  onChange={(e) => handleChange('reviewCount', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                  Customer Review / Testimonial Snippet
                </label>
                <input
                  type="text"
                  placeholder="e.g. Exceptional customer service and prompt delivery."
                  value={formData.reviews}
                  onChange={(e) => handleChange('reviews', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Internal Calling Notes / Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Inquired about enterprise package, call back Thursday at 3 PM..."
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-extrabold rounded-xl shadow-sm shadow-emerald-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to R2...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Lead with 7 Sections</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
