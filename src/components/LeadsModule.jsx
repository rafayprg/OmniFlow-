import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useCrm } from '../context/CrmContext';
import { StatusBadge } from './StatusBadge';
import { formatWhatsAppUrl, formatTelUrl, WhatsAppIcon } from '../utils/phoneUtils';
import { BUSINESS_CATEGORIES, getCategoryConfig, CategoryBadge } from '../utils/categoryUtils';
import { 
  SocialLinksBadges, 
  ReviewsRating, 
  AddressLocation 
} from '../utils/socialUtils';
import { LeadDetailsModal } from './LeadDetailsModal';
import { BulkUploadModal } from './BulkUploadModal';
import { 
  PhoneForwarded, 
  Phone, 
  ChevronDown, 
  Check, 
  Database, 
  Download, 
  Trash2,
  Briefcase,
  Clock,
  UserPlus,
  Upload,
  Eye
} from 'lucide-react';

export const LeadsModule = ({ searchQuery, setSearchQuery, onOpenAddLead, onOpenUpload }) => {
  const { 
    leads, 
    agents, 
    updateLeadStatus, 
    updateLeadCategory,
    deleteLead, 
    setActiveTab, 
    auth, 
    addToast 
  } = useCrm();

  const isAgent = auth?.type === 'agent';
  const [agentViewScope, setAgentViewScope] = useState('ALL'); // 'ALL' | 'MY' | 'UNASSIGNED'
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [activeNoteLeadId, setActiveNoteLeadId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Selected lead for full details modal
  const [selectedLeadForDetails, setSelectedLeadForDetails] = useState(null);
  // Upload raw data modal state
  const [isLocalUploadOpen, setIsLocalUploadOpen] = useState(false);

  const myAssignedCount = useMemo(() => {
    return leads.filter(l => l.assignedAgent === auth?.name).length;
  }, [leads, auth]);

  const unassignedCount = useMemo(() => {
    return leads.filter(l => !l.assignedAgent || l.assignedAgent === 'Unassigned').length;
  }, [leads]);

  // Leads scoped to this user
  const scopedLeads = useMemo(() => {
    if (!isAgent) return leads;
    if (agentViewScope === 'MY') {
      return leads.filter(l => l.assignedAgent === auth?.name);
    }
    if (agentViewScope === 'UNASSIGNED') {
      return leads.filter(l => !l.assignedAgent || l.assignedAgent === 'Unassigned');
    }
    return leads; // 'ALL'
  }, [leads, isAgent, auth, agentViewScope]);

  // Compute dynamic category pills based on uploaded data in the pipeline
  const categoryPills = useMemo(() => {
    const counts = {};
    scopedLeads.forEach(l => {
      const cat = l.category || l.industry || 'General Business';
      counts[cat] = (counts[cat] || 0) + 1;
    });

    // Match with predefined business categories
    const list = BUSINESS_CATEGORIES.filter(c => (counts[c.id] || 0) > 0).map(c => ({
      ...c,
      count: counts[c.id] || 0
    }));

    // Append any extra/custom categories from Excel
    Object.keys(counts).forEach(catName => {
      if (!BUSINESS_CATEGORIES.some(c => c.id === catName)) {
        list.push({
          id: catName,
          label: catName,
          shortLabel: catName,
          icon: Briefcase,
          timings: 'Standard Hours',
          timingHint: 'General Business',
          badgeClass: 'bg-slate-100 text-slate-800 border-slate-200',
          activeClass: 'bg-slate-800 text-white border-slate-800',
          dotClass: 'bg-slate-500',
          count: counts[catName]
        });
      }
    });

    return list;
  }, [scopedLeads]);

  const filteredLeads = useMemo(() => {
    return scopedLeads.filter(lead => {
      const leadCat = lead.category || lead.industry || 'General Business';
      
      // 1. Category Filter
      if (selectedCategory !== 'ALL' && leadCat !== selectedCategory) {
        return false;
      }

      // 2. Status Filter
      if (activeStatusTab !== 'ALL' && lead.status !== activeStatusTab) {
        return false;
      }

      // 3. Agent Filter
      if (!isAgent && agentFilter !== 'ALL' && lead.assignedAgent !== agentFilter) {
        return false;
      }

      // 4. Search Filter
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q ||
        (lead.name && lead.name.toLowerCase().includes(q)) ||
        (lead.phone && String(lead.phone).includes(q)) ||
        (lead.id && String(lead.id).toLowerCase().includes(q)) ||
        (lead.email && lead.email.toLowerCase().includes(q)) ||
        (lead.address && lead.address.toLowerCase().includes(q)) ||
        (lead.city && lead.city.toLowerCase().includes(q)) ||
        (lead.contactPerson && lead.contactPerson.toLowerCase().includes(q)) ||
        (leadCat && leadCat.toLowerCase().includes(q)) ||
        (lead.assignedAgent && lead.assignedAgent.toLowerCase().includes(q));

      return matchesSearch;
    });
  }, [scopedLeads, searchQuery, selectedCategory, activeStatusTab, agentFilter, isAgent]);

  const statusTabs = [
    {
      id: 'ALL',
      label: isAgent ? 'My Leads' : 'All Leads',
      count: scopedLeads.filter(l => selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory).length,
      badgeClass: 'bg-slate-200 text-slate-700'
    },
    {
      id: 'Pending',
      label: 'Pending',
      count: scopedLeads.filter(l => l.status === 'Pending' && (selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-amber-100 text-amber-800 font-bold',
      desc: 'Awaiting outreach'
    },
    {
      id: 'Connected',
      label: 'Connected',
      count: scopedLeads.filter(l => l.status === 'Connected' && (selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-blue-100 text-blue-800 font-bold',
      desc: 'In discussions'
    },
    {
      id: 'Not Connected',
      label: '📞 Not Connected',
      count: scopedLeads.filter(l => l.status === 'Not Connected' && (selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-orange-100 text-orange-800 font-bold',
      desc: 'Call placed but did not connect (no answer / busy)'
    },
    {
      id: 'Interested',
      label: 'Interested (Hot)',
      count: scopedLeads.filter(l => l.status === 'Interested' && (selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
      desc: 'Ready to convert'
    },
    {
      id: 'Not Interested',
      label: 'Not Interested',
      count: scopedLeads.filter(l => l.status === 'Not Interested' && (selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-rose-100 text-rose-800 font-bold',
      desc: 'Dead leads'
    },
    {
      id: 'Not on WhatsApp',
      label: '📵 Not on WhatsApp',
      count: scopedLeads.filter(l => l.status === 'Not on WhatsApp' && (selectedCategory === 'ALL' || (l.category || l.industry || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-slate-200 text-slate-800 font-bold',
      desc: 'Numbers not registered on WhatsApp'
    }
  ];

  // Export current leads view to real Excel (.xlsx) file with all 7 sections
  const handleExportLeadsExcel = () => {
    const exportRows = filteredLeads.map(l => ({
      "Lead ID": l.id,
      "Customer Reference": l.customerId,
      // 1. Business Name
      "Business Name": l.name,
      "Contact Person": l.contactPerson || '',
      // 2. Contact
      "Phone Number": l.phone,
      "Email Address": l.email,
      // 3. Address
      "Address": l.address || '',
      "City": l.city || '',
      "State": l.state || '',
      "Postal Code": l.postalCode || '',
      "Country": l.country || '',
      // 4. Industry
      "Industry / Category": l.industry || l.category || "General Business",
      "Calling Timings": getCategoryConfig(l.category || l.industry).timings,
      // 5. Website & Socials
      "Website": l.website || '',
      "Instagram": l.instagram || '',
      "Facebook": l.facebook || '',
      "LinkedIn": l.linkedin || '',
      "TikTok": l.tiktok || '',
      "YouTube": l.youtube || '',
      "Twitter": l.twitter || '',
      // 6. Reviews
      "Rating": l.rating || '',
      "Total Reviews": l.reviewCount || '',
      "Reviews Feedback": l.reviews || '',
      // Pipeline metadata
      "Assigned Agent": l.assignedAgent,
      "Pipeline Status": l.status,
      "Source Origin": l.source,
      "Assigned Date": l.assignedDate,
      "Last Contacted": l.lastContactDate || "Not contacted yet",
      "Agent Notes": l.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads_Pipeline_7_Sections");
    XLSX.writeFile(workbook, `OmniFlow_Leads_${selectedCategory === 'ALL' ? 'All' : selectedCategory}_${new Date().toISOString().split('T')[0]}.xlsx`);

    addToast({
      title: 'Excel Export Complete',
      message: `Exported ${exportRows.length} active leads with all 7 sections to .xlsx file.`,
      type: 'success'
    });
  };

  const handleToggleNoteEdit = (lead) => {
    if (activeNoteLeadId === lead.id) {
      setActiveNoteLeadId(null);
    } else {
      setActiveNoteLeadId(lead.id);
      setNoteDraft(lead.notes || '');
    }
  };

  const handleSaveNote = async (leadId, currentStatus) => {
    await updateLeadStatus(leadId, currentStatus, noteDraft);
    setActiveNoteLeadId(null);
  };

  const handleTriggerUpload = () => {
    if (onOpenUpload) {
      onOpenUpload();
    } else {
      setIsLocalUploadOpen(true);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. CLEAN SECTION HEADER WITH UPLOAD RAW DATA BUTTON */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isAgent ? 'My Assigned Leads' : 'Leads Pipeline'}
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredLeads.length} Leads
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Structured records containing: <strong>Business, Contact, Address, Industry, Socials, Website & Reviews</strong>. Click phone for 1-tap WhatsApp.
          </p>

          {isAgent && (
            <div className="flex items-center gap-1.5 mt-2.5 p-1 bg-slate-200/80 rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setAgentViewScope('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  agentViewScope === 'ALL' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Team Leads ({leads.length})
              </button>
              <button
                type="button"
                onClick={() => setAgentViewScope('MY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  agentViewScope === 'MY' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                My Leads ({myAssignedCount})
              </button>
              <button
                type="button"
                onClick={() => setAgentViewScope('UNASSIGNED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  agentViewScope === 'UNASSIGNED' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unassigned Pool ({unassignedCount})
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto shrink-0">
          {/* UPLOAD RAW DATA BUTTON */}
          <button
            onClick={handleTriggerUpload}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/25 cursor-pointer"
            title="Upload raw spreadsheet or paste data to auto-organize into leads"
          >
            <Upload className="w-4 h-4" />
            <span>📥 Upload Raw Data</span>
          </button>

          {onOpenAddLead && (
            <button
              onClick={onOpenAddLead}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/25 cursor-pointer"
              title="Add a single new lead directly into pipeline"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Lead</span>
            </button>
          )}

          <button
            onClick={handleExportLeadsExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download current leads list with all 7 sections as Excel spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {!isAgent && (
            <button
              onClick={() => setActiveTab('customers')}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Database className="w-4 h-4 text-blue-600" />
              <span className="hidden md:inline">Customers Pool</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. BUSINESS CATEGORIES SELECTOR (Filter by business working hours & industry) */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-blue-600" />
              <span>Industry / Category Filter (Shift Timings):</span>
            </span>
            {selectedCategory !== 'ALL' && (
              <button
                onClick={() => setSelectedCategory('ALL')}
                className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
              >
                Reset to All
              </button>
            )}
          </div>
          <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
            Target businesses during their optimal operational shift
          </span>
        </div>

        {/* Horizontally scrollable category buttons */}
        <div className="overflow-x-auto pb-1 flex items-center gap-2 -mx-1 px-1">
          {/* All Categories Button */}
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>All Industries</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
              selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-white text-slate-700'
            }`}>
              {scopedLeads.length}
            </span>
          </button>

          {/* Individual Category Buttons */}
          {categoryPills.map(cat => {
            const isActive = selectedCategory === cat.id;
            const Icon = cat.icon || Briefcase;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? `${cat.activeClass || 'bg-blue-600 text-white'} shadow-xs`
                    : 'bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700'
                }`}
                title={`${cat.label} - Optimal Calling Hours: ${cat.timings}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.shortLabel || cat.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                  isActive ? 'bg-white/25 text-white' : 'bg-slate-200/80 text-slate-800'
                }`}>
                  {cat.count}
                </span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono hidden md:inline ${
                  isActive ? 'bg-black/20 text-white' : 'text-slate-400 bg-slate-100'
                }`}>
                  ⏰ {cat.timings}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. STATUS TABS & AGENT FILTER */}
      <div className="bg-white p-3 sm:p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="overflow-x-auto pb-1 sm:pb-0 flex items-center gap-1.5 shrink-0 -mx-1 px-1">
            {statusTabs.map((tab) => {
              const isActive = activeStatusTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatusTab(tab.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : tab.badgeClass
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {!isAgent && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-semibold shrink-0">Filter Agent:</span>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 cursor-pointer"
              >
                <option value="ALL">All Agents ({leads.length})</option>
                {agents.map((agent) => {
                  const count = leads.filter(l => l.assignedAgent === agent.name).length;
                  return (
                    <option key={agent.id} value={agent.name}>
                      {agent.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 4. MOBILE VIEW: 1-TAP TOUCH CARDS (WITH ALL 7 SECTIONS) */}
      <div className="block md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <PhoneForwarded className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
            <p className="font-semibold text-slate-700 text-sm">No leads in this filter</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Upload raw data or add a new lead directly to get started.
            </p>
            <button
              onClick={handleTriggerUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Raw Data</span>
            </button>
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const waUrl = formatWhatsAppUrl(lead.phone);
            const telUrl = formatTelUrl(lead.phone);
            const isEditingNote = activeNoteLeadId === lead.id;
            const catConfig = getCategoryConfig(lead.category || lead.industry);

            return (
              <div 
                key={lead.id} 
                className={`bg-white rounded-2xl border transition-all p-4 shadow-xs space-y-3 ${
                  lead.status === 'Pending' 
                    ? 'border-amber-200/80 bg-amber-50/15' 
                    : lead.status === 'Interested'
                    ? 'border-emerald-200/80 bg-emerald-50/10'
                    : lead.status === 'Not on WhatsApp'
                    ? 'border-slate-300 bg-slate-50/60 ring-1 ring-slate-400/20'
                    : 'border-slate-200'
                }`}
              >
                {/* Section 1: Business Name, Contact Person, Industry Badge */}
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedLeadForDetails(lead)}
                          className="font-extrabold text-slate-900 text-base leading-snug hover:text-blue-600 text-left cursor-pointer"
                        >
                          {lead.name}
                        </button>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {lead.id}
                        </span>
                      </div>

                      {lead.contactPerson && (
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-0.5 font-medium">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>Contact Person: <strong className="text-slate-800">{lead.contactPerson}</strong></span>
                        </p>
                      )}
                    </div>

                    <CategoryBadge category={lead.category || lead.industry} showTimings={false} size="xs" />
                  </div>

                  {/* Section 3: Address & Location */}
                  {(lead.address || lead.city) && (
                    <div className="pt-0.5">
                      <AddressLocation address={lead.address} city={lead.city} state={lead.state} compact={false} />
                    </div>
                  )}

                  {/* Section 7: Reviews & Reputation */}
                  {(lead.rating || lead.reviewCount || lead.reviews) && (
                    <div className="pt-1">
                      <ReviewsRating rating={lead.rating} reviewCount={lead.reviewCount} reviews={lead.reviews} showSnippet={true} />
                    </div>
                  )}

                  {/* Section 5 & 6: Website & Socials Badges */}
                  <SocialLinksBadges lead={lead} size="sm" />
                </div>

                {/* Section 2: Contact Phone Bar (1-Tap WhatsApp Push) */}
                <div className="flex items-center justify-between text-xs bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-medium">Contact:</span>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-emerald-700 hover:text-emerald-800 text-sm tracking-wide flex items-center gap-1.5"
                      title="Tap to open WhatsApp"
                    >
                      <WhatsAppIcon className="w-4 h-4 fill-emerald-600" />
                      <span>{lead.phone}</span>
                    </a>
                  </div>

                  <button
                    onClick={() => setSelectedLeadForDetails(lead)}
                    className="text-xs text-blue-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Details</span>
                  </button>
                </div>

                {/* 1-Tap Big Call Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <WhatsAppIcon className="w-4 h-4 fill-white shrink-0" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={telUrl}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>Direct Call</span>
                  </a>
                </div>

                {/* 1-Tap Status Quick Selector */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-slate-400">
                      1-Tap Call Status:
                    </span>
                    <StatusBadge status={lead.status} size="sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'Pending', label: '1. Pending', bg: 'bg-amber-500 border-amber-500 text-white' },
                      { id: 'Connected', label: '2. Connected', bg: 'bg-blue-600 border-blue-600 text-white' },
                      { id: 'Not Connected', label: '3. 📵 Not Conn.', bg: 'bg-orange-600 border-orange-600 text-white' },
                      { id: 'Interested', label: '4. 🔥 Interested', bg: 'bg-emerald-600 border-emerald-600 text-white' },
                      { id: 'Not Interested', label: '5. ✕ Not Int.', bg: 'bg-rose-600 border-rose-600 text-white' },
                      { id: 'Not on WhatsApp', label: '6. 📵 Not on WA', bg: 'bg-slate-800 border-slate-800 text-white' }
                    ].map(st => {
                      const isSelected = lead.status === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => updateLeadStatus(lead.id, st.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                            isSelected
                              ? `${st.bg} shadow-xs font-extrabold`
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{st.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Notes log */}
                {lead.notes && (
                  <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                    <strong className="text-slate-800">Note:</strong> {lead.notes}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 5. DESKTOP VIEW: ADVANCED 7-SECTIONS TABLE */}
      <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 min-w-[200px]">🏢 1. Business Name</th>
                <th className="py-3.5 px-4 min-w-[170px]">📞 2. Contact (WA & Phone)</th>
                <th className="py-3.5 px-4 min-w-[190px]">📍 3. Address & Location</th>
                <th className="py-3.5 px-4 min-w-[150px]">🏭 4. Industry & Timings</th>
                <th className="py-3.5 px-4 min-w-[170px]">🌐 5 & 6. Web & Socials</th>
                <th className="py-3.5 px-4 min-w-[130px]">⭐ 7. Reviews</th>
                <th className="py-3.5 px-4 min-w-[160px]">Status</th>
                <th className="py-3.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <PhoneForwarded className="w-9 h-9 mx-auto mb-2 opacity-40 text-blue-600" />
                    <p className="font-bold text-slate-700 text-sm">No leads match this view</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">
                      Upload raw data or adjust filters to view leads.
                    </p>
                    <button
                      onClick={handleTriggerUpload}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Raw Data</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const waUrl = formatWhatsAppUrl(lead.phone);
                  const telUrl = formatTelUrl(lead.phone);
                  const catConfig = getCategoryConfig(lead.category || lead.industry);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        lead.status === 'Pending' ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      {/* SECTION 1: BUSINESS NAME */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              onClick={() => setSelectedLeadForDetails(lead)}
                              className="font-extrabold text-slate-900 text-xs hover:text-blue-600 text-left transition-colors cursor-pointer"
                              title="Click to view all lead sections & sheet details"
                            >
                              {lead.name}
                            </button>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <span className="font-bold bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded">
                              {lead.id}
                            </span>
                            {lead.contactPerson && (
                              <span className="text-slate-600 font-sans font-medium truncate max-w-[120px]">
                                • 👤 {lead.contactPerson}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* SECTION 2: CONTACT */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <a 
                              href={waUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors text-xs font-bold"
                              title="1-Click WhatsApp Direct Chat"
                            >
                              <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 shrink-0" />
                              <span>{lead.phone}</span>
                            </a>

                            <a
                              href={telUrl}
                              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                              title="Direct Phone Call"
                            >
                              <Phone className="w-3 h-3" />
                            </a>
                          </div>

                          {lead.email && (
                            <p className="text-[11px] text-slate-400 truncate max-w-[150px] font-sans">
                              {lead.email}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* SECTION 3: ADDRESS */}
                      <td className="py-3.5 px-4">
                        <AddressLocation 
                          address={lead.address} 
                          city={lead.city} 
                          state={lead.state} 
                          compact={true} 
                        />
                      </td>

                      {/* SECTION 4: INDUSTRY & TIMINGS */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <CategoryBadge category={lead.category || lead.industry} showTimings={false} size="xs" />
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-2.5 h-2.5 text-blue-500" />
                            <span>{catConfig.timings}</span>
                          </div>
                        </div>
                      </td>

                      {/* SECTION 5 & 6: WEBSITE & SOCIALS */}
                      <td className="py-3.5 px-4">
                        <SocialLinksBadges lead={lead} size="xs" />
                      </td>

                      {/* SECTION 7: REVIEWS */}
                      <td className="py-3.5 px-4">
                        <ReviewsRating rating={lead.rating} reviewCount={lead.reviewCount} compact={true} />
                      </td>

                      {/* PIPELINE STATUS */}
                      <td className="py-3.5 px-4">
                        <div className="relative">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            className={`w-full appearance-none pl-2.5 pr-7 py-1 rounded-lg text-xs font-bold border shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                              lead.status === 'Pending'
                                ? 'bg-amber-50 border-amber-300 text-amber-900'
                                : lead.status === 'Connected'
                                ? 'bg-blue-50 border-blue-300 text-blue-900'
                                : lead.status === 'Not Connected'
                                ? 'bg-orange-50 border-orange-300 text-orange-900'
                                : lead.status === 'Interested'
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                                : lead.status === 'Not on WhatsApp'
                                ? 'bg-slate-100 border-slate-300 text-slate-800'
                                : 'bg-rose-50 border-rose-300 text-rose-900'
                            }`}
                          >
                            <option value="Pending">1. Pending</option>
                            <option value="Connected">2. Connected</option>
                            <option value="Not Connected">3. Not Connected</option>
                            <option value="Interested">4. Interested 🔥</option>
                            <option value="Not Interested">5. Not Interested ✕</option>
                            <option value="Not on WhatsApp">6. Not on WA 📵</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      {/* QUICK ACTIONS */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => setSelectedLeadForDetails(lead)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Inspect all 7 sections & sheet details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!isAgent && (
                            <button
                              onClick={() => deleteLead(lead.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Delete lead"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* LEAD DETAILS MODAL: DISPLAYS ALL 7 SECTIONS + ALL SHEET COLUMNS */}
      {selectedLeadForDetails && (
        <LeadDetailsModal
          lead={selectedLeadForDetails}
          isOpen={Boolean(selectedLeadForDetails)}
          onClose={() => setSelectedLeadForDetails(null)}
        />
      )}

      {/* RAW DATA UPLOAD MODAL */}
      <BulkUploadModal
        isOpen={isLocalUploadOpen}
        onClose={() => setIsLocalUploadOpen(false)}
        initialTarget="leads"
      />
    </div>
  );
};
