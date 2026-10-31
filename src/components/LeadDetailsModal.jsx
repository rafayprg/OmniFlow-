import React, { useState } from 'react';
import { useCrm } from '../context/CrmContext';
import {
  X,
  Building2,
  User,
  Phone,
  Mail,
  MapPin,
  Briefcase,
  Globe,
  Star,
  FileText,
  ExternalLink,
  Clock,
  Copy,
  Check,
  Share2,
  Layers,
  Sparkles
} from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { formatWhatsAppUrl, formatTelUrl, WhatsAppIcon } from '../utils/phoneUtils';
import { getCategoryConfig, CategoryBadge } from '../utils/categoryUtils';
import {
  ReviewsRating,
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  TikTokIcon,
  YouTubeIcon,
  TwitterIcon,
  formatSocialUrl
} from '../utils/socialUtils';

export const LeadDetailsModal = ({ lead, isOpen, onClose }) => {
  const { updateLeadStatus, addToast } = useCrm();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'sheetData'
  const [copiedKey, setCopiedKey] = useState(null);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [sheetSearch, setSheetSearch] = useState('');

  if (!isOpen || !lead) return null;

  const waUrl = formatWhatsAppUrl(lead.phone);
  const telUrl = formatTelUrl(lead.phone);
  const catConfig = getCategoryConfig(lead.category || lead.industry);

  const addressParts = [lead.address, lead.city, lead.state, lead.country].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  const mapsUrl = fullAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`
    : (lead.name ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(lead.name + ' ' + (lead.city || ''))}` : null);

  const handleCopy = (text, keyName) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
    addToast({
      title: 'Copied to Clipboard',
      message: `${keyName} copied.`,
      type: 'info'
    });
  };

  const handleSaveNotes = async () => {
    await updateLeadStatus(lead.id, lead.status, notesDraft);
    setEditingNotes(false);
  };

  // Raw details: every single column from original sheet
  const rawDetails = lead.rawDetails || {};
  const rawEntries = Object.entries(rawDetails).filter(([k, v]) => {
    if (!sheetSearch) return true;
    const q = sheetSearch.toLowerCase();
    return k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/90 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-mono text-xs font-extrabold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-lg border border-blue-200">
                {lead.id}
              </span>
              <StatusBadge status={lead.status} size="sm" />
              <CategoryBadge category={lead.category || lead.industry} size="xs" />
              {lead.source && (
                <span className="text-[10px] bg-slate-200/80 text-slate-700 px-2 py-0.5 rounded font-semibold">
                  Source: {lead.source}
                </span>
              )}
            </div>

            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight truncate">
              {lead.name}
            </h2>

            {lead.contactPerson && (
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>Contact Person: <strong className="text-slate-800">{lead.contactPerson}</strong></span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* WhatsApp Direct */}
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              title="Open WhatsApp"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span className="hidden sm:inline">WhatsApp</span>
            </a>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center px-5 border-b border-slate-200 bg-white gap-4 text-xs font-bold text-slate-600 shrink-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'overview'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent hover:text-slate-900'
              }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Organized Lead Profile (7 Sections)</span>
          </button>

          <button
            onClick={() => setActiveTab('sheetData')}
            className={`py-2.5 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${activeTab === 'sheetData'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent hover:text-slate-900'
              }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Sheet Columns ({Object.keys(rawDetails).length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs bg-slate-50/50">
          {activeTab === 'overview' ? (
            <>
              {/* SECTION 1: BUSINESS NAME & CORE IDENTITY */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span>1. Business Name & Identity</span>
                  </div>
                  <button
                    onClick={() => handleCopy(lead.name, 'Business Name')}
                    className="text-[11px] text-slate-500 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'Business Name' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Company / Trade Name</span>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">{lead.name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Contact Person / Owner</span>
                    <p className="font-semibold text-slate-800 mt-0.5">{lead.contactPerson || 'Not specified'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Assigned Agent</span>
                    <p className="font-semibold text-slate-800 mt-0.5">👤 {lead.assignedAgent || 'Unassigned'}</p>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Lead Added Date</span>
                    <p className="font-semibold text-slate-800 mt-0.5">📅 {lead.assignedDate || 'Recent'}</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: CONTACT DETAILS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>2. Contact Details</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-emerald-800">Phone / WhatsApp Number</span>
                      <button
                        onClick={() => handleCopy(lead.phone, 'Phone Number')}
                        className="text-[10px] text-emerald-700 hover:underline flex items-center gap-0.5"
                      >
                        {copiedKey === 'Phone Number' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>Copy</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-extrabold text-emerald-800 text-sm hover:underline flex items-center gap-1.5"
                      >
                        <WhatsAppIcon className="w-4 h-4 fill-emerald-600 shrink-0" />
                        <span>{lead.phone}</span>
                      </a>

                      <a
                        href={telUrl}
                        className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                        title="Direct Phone Call"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold text-slate-400">Email Address</span>
                      {lead.email && (
                        <button
                          onClick={() => handleCopy(lead.email, 'Email Address')}
                          className="text-[10px] text-slate-500 hover:text-blue-600 flex items-center gap-0.5"
                        >
                          {copiedKey === 'Email Address' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>Copy</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      {lead.email ? (
                        <a
                          href={`mailto:${lead.email}`}
                          className="font-semibold text-blue-700 hover:underline truncate max-w-[200px]"
                        >
                          {lead.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No email provided</span>
                      )}

                      {lead.email && (
                        <a
                          href={`mailto:${lead.email}`}
                          className="p-1.5 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-800"
                          title="Compose Email"
                        >
                          <Mail className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 3: ADDRESS & LOCATION */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span>3. Address & Location</span>
                  </div>
                  {mapsUrl && (
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                    >
                      <span>View on Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Full Physical Address</span>
                    <p className="font-semibold text-slate-800 mt-0.5 text-xs">
                      {lead.address || fullAddress || 'No detailed address provided in raw data'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">City</span>
                      <span className="font-bold text-slate-800">{lead.city || 'Karachi'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">State / Region</span>
                      <span className="font-bold text-slate-800">{lead.state || 'Sindh / PK'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Postal Code</span>
                      <span className="font-bold text-slate-800">{lead.postalCode || '—'}</span>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Country</span>
                      <span className="font-bold text-slate-800">{lead.country || 'Pakistan'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION 4: INDUSTRY & TIMINGS */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Briefcase className="w-4 h-4 text-indigo-600" />
                    <span>4. Industry & Operational Timings</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CategoryBadge category={lead.category || lead.industry} size="sm" />
                      <span className="text-xs font-bold text-indigo-950">
                        {lead.industry || lead.category || 'General Business'}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-800/80">
                      Target this business sector during their peak operating shift for highest conversion.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 bg-white px-3 py-1.5 rounded-lg border border-indigo-200 text-xs font-bold text-indigo-900 shadow-xs">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>Calling Hours: {catConfig.timings}</span>
                  </div>
                </div>
              </div>

              {/* SECTION 5: WEBSITE & DIGITAL PRESENCE */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Globe className="w-4 h-4 text-sky-600" />
                    <span>5. Website & Online Store</span>
                  </div>
                </div>

                {lead.website ? (
                  <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Globe className="w-4 h-4 text-sky-600 shrink-0" />
                      <a
                        href={formatSocialUrl('website', lead.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-sky-800 hover:underline truncate text-xs"
                      >
                        {lead.website}
                      </a>
                    </div>

                    <a
                      href={formatSocialUrl('website', lead.website)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shrink-0"
                    >
                      <span>Visit Site</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No website URL recorded for this lead</p>
                )}
              </div>

              {/* SECTION 6: SOCIAL MEDIA PROFILES */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Share2 className="w-4 h-4 text-pink-600" />
                    <span>6. Social Media Channels</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {[
                    { type: 'facebook', label: 'Facebook', val: lead.facebook, icon: FacebookIcon, bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
                    { type: 'instagram', label: 'Instagram', val: lead.instagram, icon: InstagramIcon, bg: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100' },
                    { type: 'linkedin', label: 'LinkedIn', val: lead.linkedin, icon: LinkedInIcon, bg: 'bg-sky-50 border-sky-200 text-sky-800 hover:bg-sky-100' },
                    { type: 'tiktok', label: 'TikTok', val: lead.tiktok, icon: TikTokIcon, bg: 'bg-slate-900 border-slate-900 text-white hover:bg-black' },
                    { type: 'youtube', label: 'YouTube', val: lead.youtube, icon: YouTubeIcon, bg: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100' },
                    { type: 'twitter', label: 'Twitter / X', val: lead.twitter, icon: TwitterIcon, bg: 'bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-900' }
                  ].map(ch => {
                    const Icon = ch.icon;
                    if (!ch.val) {
                      return (
                        <div key={ch.type} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 flex items-center gap-2 opacity-50">
                          <Icon className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-medium">{ch.label} (—)</span>
                        </div>
                      );
                    }

                    return (
                      <a
                        key={ch.type}
                        href={formatSocialUrl(ch.type, ch.val)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-1.5 shadow-2xs font-bold text-xs ${ch.bg}`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{ch.label}</span>
                        </div>
                        <ExternalLink className="w-3 h-3 shrink-0 opacity-70" />
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 7: REVIEWS & REPUTATION */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400" />
                    <span>7. Reviews, Ratings & Reputation</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <ReviewsRating
                      rating={lead.rating}
                      reviewCount={lead.reviewCount}
                      compact={false}
                    />

                    {(!lead.rating && !lead.reviewCount) && (
                      <span className="text-xs text-slate-400 italic">
                        No review statistics found in uploaded raw data
                      </span>
                    )}
                  </div>

                  {lead.reviews && (
                    <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/80 text-xs text-amber-950 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-amber-700 tracking-wider">
                        Review / Customer Testimonial Feedback:
                      </span>
                      <p className="italic font-medium leading-relaxed">
                        "{lead.reviews}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 8: PIPELINE STATUS & NOTES LOG */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Call Log & Outreach Notes</span>
                  </span>
                  {lead.lastContactDate && (
                    <span className="text-[10px] text-slate-400">Last outreach: {lead.lastContactDate}</span>
                  )}
                </div>

                {editingNotes ? (
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Add follow-up notes, price discussed, call outcome..."
                      className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingNotes(false)}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold"
                      >
                        Save Note to R2
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3">
                    <p className="text-xs text-slate-700 whitespace-pre-wrap">
                      {lead.notes || 'No agent notes recorded yet.'}
                    </p>
                    <button
                      onClick={() => {
                        setNotesDraft(lead.notes || '');
                        setEditingNotes(true);
                      }}
                      className="text-xs text-blue-600 hover:underline font-bold shrink-0 cursor-pointer"
                    >
                      {lead.notes ? 'Edit' : '+ Add Note'}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* TAB 2: RAW UNMAPPED SHEET DATA */
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">
                    All Spreadsheet Columns ({Object.keys(rawDetails).length} Columns)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Every piece of raw data from the original Excel/CSV sheet is permanently stored and accessible here.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={sheetSearch}
                    onChange={(e) => setSheetSearch(e.target.value)}
                    placeholder="Search raw fields..."
                    className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
                  />
                  <button
                    onClick={() => handleCopy(JSON.stringify(rawDetails, null, 2), 'Sheet Raw JSON')}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    {copiedKey === 'Sheet Raw JSON' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>Copy JSON</span>
                  </button>
                </div>
              </div>

              {rawEntries.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center italic">
                  No additional raw columns recorded for this lead.
                </p>
              ) : (
                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Column Name</th>
                        <th className="py-2.5 px-3">Raw Value In Sheet</th>
                        <th className="py-2.5 px-2 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rawEntries.map(([k, v]) => (
                        <tr key={k} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 text-[11px]">
                            {k}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium break-all max-w-md">
                            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                          </td>
                          <td className="py-2.5 px-2 text-right">
                            <button
                              onClick={() => handleCopy(String(v), k)}
                              className="p-1 rounded text-slate-400 hover:text-blue-600"
                              title={`Copy ${k}`}
                            >
                              {copiedKey === k ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Quick Change Status:</span>
            <select
              value={lead.status}
              onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 shadow-xs cursor-pointer focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Pending">1. Pending</option>
              <option value="Connected">2. Connected</option>
              <option value="Not Connected">3. Not Connected</option>
              <option value="Interested">4. Interested 🔥</option>
              <option value="Not Interested">5. Not Interested ✕</option>
              <option value="Not on WhatsApp">6. Not on WhatsApp 📵</option>
            </select>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
