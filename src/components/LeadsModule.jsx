import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useCrm } from '../context/CrmContext';
import { StatusBadge, SourceBadge } from './StatusBadge';
import { formatWhatsAppUrl, formatTelUrl, WhatsAppIcon } from '../utils/phoneUtils';
import { BUSINESS_CATEGORIES, getCategoryConfig, CategoryBadge } from '../utils/categoryUtils';
import { SocialLinksBadges } from '../utils/socialUtils';
import { 
  PhoneForwarded, 
  Phone, 
  PhoneMissed,
  ChevronDown, 
  Check, 
  Database, 
  Download, 
  Trash2,
  MessageSquare,
  FileText,
  Calendar,
  User,
  Sparkles,
  Briefcase,
  Clock,
  Filter,
  UserPlus
} from 'lucide-react';

export const LeadsModule = ({ searchQuery, setSearchQuery, onOpenAddLead }) => {
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
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [activeStatusTab, setActiveStatusTab] = useState('ALL');
  const [agentFilter, setAgentFilter] = useState('ALL');
  const [activeNoteLeadId, setActiveNoteLeadId] = useState(null);
  const [noteDraft, setNoteDraft] = useState('');

  // Leads scoped to this user
  const scopedLeads = useMemo(() => {
    return isAgent ? leads.filter(l => l.assignedAgent === auth?.name) : leads;
  }, [leads, isAgent, auth]);

  // Compute dynamic category pills based on uploaded data in the pipeline
  const categoryPills = useMemo(() => {
    const counts = {};
    scopedLeads.forEach(l => {
      const cat = l.category || 'General Business';
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
      const leadCat = lead.category || 'General Business';
      
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
      const matchesSearch = !searchQuery ||
        lead.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.phone?.includes(searchQuery) ||
        lead.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        leadCat.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.assignedAgent?.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [scopedLeads, searchQuery, selectedCategory, activeStatusTab, agentFilter, isAgent]);

  const statusTabs = [
    {
      id: 'ALL',
      label: isAgent ? 'My Leads' : 'All Leads',
      count: scopedLeads.filter(l => selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory).length,
      badgeClass: 'bg-slate-200 text-slate-700'
    },
    {
      id: 'Pending',
      label: 'Pending',
      count: scopedLeads.filter(l => l.status === 'Pending' && (selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-amber-100 text-amber-800 font-bold',
      desc: 'Awaiting outreach'
    },
    {
      id: 'Connected',
      label: 'Connected',
      count: scopedLeads.filter(l => l.status === 'Connected' && (selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-blue-100 text-blue-800 font-bold',
      desc: 'In discussions'
    },
    {
      id: 'Not Connected',
      label: '📞 Not Connected',
      count: scopedLeads.filter(l => l.status === 'Not Connected' && (selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-orange-100 text-orange-800 font-bold',
      desc: 'Call placed but did not connect (no answer / busy)'
    },
    {
      id: 'Interested',
      label: 'Interested (Hot)',
      count: scopedLeads.filter(l => l.status === 'Interested' && (selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-emerald-100 text-emerald-800 font-bold',
      desc: 'Ready to convert'
    },
    {
      id: 'Not Interested',
      label: 'Not Interested',
      count: scopedLeads.filter(l => l.status === 'Not Interested' && (selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-rose-100 text-rose-800 font-bold',
      desc: 'Dead leads'
    },
    {
      id: 'Not on WhatsApp',
      label: '📵 Not on WhatsApp',
      count: scopedLeads.filter(l => l.status === 'Not on WhatsApp' && (selectedCategory === 'ALL' || (l.category || 'General Business') === selectedCategory)).length,
      badgeClass: 'bg-slate-200 text-slate-800 font-bold',
      desc: 'Numbers not registered on WhatsApp'
    }
  ];

  // Export current leads view to real Excel (.xlsx) file
  const handleExportLeadsExcel = () => {
    const exportRows = filteredLeads.map(l => ({
      "Lead ID": l.id,
      "Customer Reference": l.customerId,
      "Lead / Company Name": l.name,
      "Business Category": l.category || "General Business",
      "Calling Timings": getCategoryConfig(l.category).timings,
      "Phone Number": l.phone,
      "Email Address": l.email,
      "Website": l.website || '',
      "Instagram": l.instagram || '',
      "TikTok": l.tiktok || '',
      "LinkedIn": l.linkedin || '',
      "YouTube": l.youtube || '',
      "Assigned Agent": l.assignedAgent,
      "Pipeline Status": l.status,
      "Source Origin": l.source,
      "Assigned Date": l.assignedDate,
      "Last Contacted": l.lastContactDate || "Not contacted yet",
      "Agent Notes": l.notes
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads_Pipeline");
    XLSX.writeFile(workbook, `OmniFlow_Leads_${selectedCategory === 'ALL' ? 'All' : selectedCategory}_${new Date().toISOString().split('T')[0]}.xlsx`);

    addToast({
      title: 'Excel Export Complete',
      message: `Exported ${exportRows.length} active leads to .xlsx file.`,
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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. CLEAN SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              {isAgent ? 'My Assigned Leads' : 'Leads Pipeline'}
            </h1>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              {filteredLeads.length} Leads
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Select a business category to target leads during their peak calling hours. Click phone to open WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          {onOpenAddLead && (
            <button
              onClick={onOpenAddLead}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-500/25 cursor-pointer"
              title="Add a new lead directly into pipeline"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add Lead</span>
            </button>
          )}

          <button
            onClick={handleExportLeadsExcel}
            className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download current leads list as Excel spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export Excel</span>
          </button>

          {!isAgent && (
            <button
              onClick={() => setActiveTab('customers')}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-500/25 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Customers Pool</span>
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
              <span>Business Category Filter (Timings):</span>
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
            <span>All Categories</span>
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

      {/* 3. STATUS TABS (Horizontally scrollable on mobile) */}
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

      {/* 4. MOBILE VIEW: 1-TAP TOUCH CARDS (Shown on phones & small screens) */}
      <div className="block md:hidden space-y-3">
        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <PhoneForwarded className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
            <p className="font-semibold text-slate-700 text-sm">No leads in this filter</p>
            <p className="text-xs text-slate-400 mt-1 mb-3">
              Try selecting "All Categories", clearing the filter, or add a new lead directly.
            </p>
            {onOpenAddLead && (
              <button
                onClick={onOpenAddLead}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-500/20 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add New Lead</span>
              </button>
            )}
          </div>
        ) : (
          filteredLeads.map((lead) => {
            const waUrl = formatWhatsAppUrl(lead.phone);
            const telUrl = formatTelUrl(lead.phone);
            const isEditingNote = activeNoteLeadId === lead.id;
            const catConfig = getCategoryConfig(lead.category);

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
                {/* Header: Name, ID, Category & Timings */}
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-base leading-snug">
                          {lead.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {lead.id}
                        </span>
                      </div>
                      {lead.email && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">
                          {lead.email}
                        </p>
                      )}
                      <SocialLinksBadges lead={lead} />
                    </div>

                    <SourceBadge source={lead.source} />
                  </div>

                  {/* Category Badge & Shift Timing */}
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <CategoryBadge category={lead.category} showTimings={true} size="xs" />
                    
                    <span className="text-[10px] text-slate-500 font-medium flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-blue-500" />
                      <span>{catConfig.timings}</span>
                    </span>
                  </div>
                </div>

                {/* Direct Phone Display (Clicking pushes to WhatsApp) */}
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

                  {!isAgent && (
                    <span className="text-[11px] text-slate-500 font-medium truncate max-w-[120px]">
                      👤 {lead.assignedAgent}
                    </span>
                  )}
                </div>

                {/* 1-Tap Big Action Buttons for Mobile Phone */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  {/* WhatsApp Push Button */}
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-sm shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <WhatsAppIcon className="w-4 h-4 fill-white shrink-0" />
                    <span>WhatsApp</span>
                  </a>

                  {/* Regular Phone Call Button */}
                  <a
                    href={telUrl}
                    className="py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-xs shadow-sm shadow-blue-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                  >
                    <Phone className="w-3.5 h-3.5 shrink-0" />
                    <span>Direct Call</span>
                  </a>
                </div>

                {/* 1-Tap Status Quick Selector (Super fast for calling team) */}
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
                      { id: 'Not Connected', label: '3. 📵 Not Connected', bg: 'bg-orange-600 border-orange-600 text-white' },
                      { id: 'Interested', label: '4. 🔥 Interested', bg: 'bg-emerald-600 border-emerald-600 text-white' },
                      { id: 'Not Interested', label: '5. ✕ Not Int.', bg: 'bg-rose-600 border-rose-600 text-white' },
                      { id: 'Not on WhatsApp', label: '6. 📵 Not on WA', bg: 'bg-slate-800 border-slate-800 text-white' }
                    ].map(st => {
                      const isSelected = lead.status === st.id;
                      return (
                        <button
                          key={st.id}
                          onClick={() => updateLeadStatus(lead.id, st.id)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${st.colSpan || ''} ${
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

                {/* Helpful prompt if call was Not Connected */}
                {lead.status === 'Not Connected' && (
                  <div className="p-2.5 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <PhoneMissed className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="text-[11px] text-orange-900 font-medium truncate">
                        Call didn't connect — Tap to redial:
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={telUrl}
                        className="px-2.5 py-1 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1"
                        title="Redial phone call"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Redial</span>
                      </a>
                      <button
                        onClick={() => updateLeadStatus(lead.id, 'Connected')}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer"
                        title="Mark Connected if answered"
                      >
                        <span>Connected</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Helpful prompt if number is Not on WhatsApp */}
                {lead.status === 'Not on WhatsApp' && (
                  <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-700 font-medium">
                      📵 Number not on WhatsApp — call directly:
                    </span>
                    <a
                      href={telUrl}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1 shrink-0"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Phone Call</span>
                    </a>
                  </div>
                )}

                {/* Notes & Call Log Toggle */}
                <div className="pt-1">
                  {isEditingNote ? (
                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-700">Call Log / Note:</span>
                        <button
                          onClick={() => setActiveNoteLeadId(null)}
                          className="text-[10px] text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="e.g. Talked on WhatsApp, sent pricing quotation, call back tomorrow..."
                        className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                      <button
                        onClick={() => handleSaveNote(lead.id, lead.status)}
                        className="w-full py-1.5 bg-blue-600 text-white font-bold text-xs rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                      >
                        Save Note to R2
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <button
                        onClick={() => handleToggleNoteEdit(lead)}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>{lead.notes ? 'Edit Note' : '+ Add Note'}</span>
                      </button>

                      {lead.lastContactDate && (
                        <span className="text-[10px] text-slate-400">
                          {lead.lastContactDate}
                        </span>
                      )}
                    </div>
                  )}

                  {lead.notes && !isEditingNote && (
                    <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-100 text-[11px] text-slate-600">
                      <strong className="text-slate-800">Note:</strong> {lead.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 5. DESKTOP VIEW: FULL TABLE (Hidden on mobile phones, shown on md and larger) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-5">Lead ID</th>
                <th className="py-3.5 px-5">Lead Name</th>
                <th className="py-3.5 px-4">Business Category & Timings</th>
                <th className="py-3.5 px-4">Phone / WhatsApp</th>
                <th className="py-3.5 px-4">Assigned Agent</th>
                <th className="py-3.5 px-6 min-w-[220px]">Status (Interactive Dropdown)</th>
                <th className="py-3.5 px-4">Source / Origin</th>
                <th className="py-3.5 px-4 text-right">Quick Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <PhoneForwarded className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
                    <p className="font-semibold text-slate-600">No leads in this filter</p>
                    <p className="text-xs text-slate-400 mt-0.5 mb-3">
                      {leads.length === 0
                        ? 'No leads found in pipeline. Click below to add a new lead.'
                        : 'Try changing the category or status tabs, or clearing the search query.'}
                    </p>
                    {onOpenAddLead && (
                      <button
                        onClick={onOpenAddLead}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-500/20 cursor-pointer"
                      >
                        <UserPlus className="w-4 h-4" />
                        <span>+ Add New Lead</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const waUrl = formatWhatsAppUrl(lead.phone);
                  const telUrl = formatTelUrl(lead.phone);
                  const catConfig = getCategoryConfig(lead.category);

                  return (
                    <tr
                      key={lead.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        lead.status === 'Pending' ? 'bg-amber-50/15' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                            {lead.id}
                          </span>
                          <p className="text-[10px] text-slate-400 font-mono">
                            from {lead.customerId}
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-5">
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {lead.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {lead.email || 'No email registered'}
                          </p>
                          <SocialLinksBadges lead={lead} />
                        </div>
                      </td>

                      {/* Business Category & Timings */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <CategoryBadge category={lead.category} showTimings={true} size="xs" />
                          <div className="flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3 text-blue-500" />
                            <span>{catConfig.timings}</span>
                          </div>
                        </div>
                      </td>

                      {/* Phone Number with 1-Tap WhatsApp Push */}
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <div className="flex items-center gap-2">
                          <a 
                            href={waUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                            title="Click to open WhatsApp Call / Chat"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 shrink-0" />
                            <span>{lead.phone}</span>
                          </a>

                          <a
                            href={telUrl}
                            className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Direct Phone Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                            {lead.assignedAgent ? lead.assignedAgent.split(' ').map(n => n[0]).join('') : 'A'}
                          </div>
                          <span className="font-semibold text-slate-800">
                            {lead.assignedAgent}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-6">
                        <div className="relative">
                          <select
                            value={lead.status}
                            onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                            aria-label={`Update status for ${lead.name}`}
                            className={`w-full appearance-none pl-3 pr-8 py-1.5 rounded-lg text-xs font-bold border shadow-xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/30 ${
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
                            <option value="Pending">1. Pending (Awaiting Outreach)</option>
                            <option value="Connected">2. Connected (Contact Made)</option>
                            <option value="Not Connected">3. Not Connected (Call Missed / Busy)</option>
                            <option value="Interested">4. Interested (Hot Lead 🔥)</option>
                            <option value="Not Interested">5. Not Interested (Dead Lead ✕)</option>
                            <option value="Not on WhatsApp">6. Not on WhatsApp (📵)</option>
                          </select>
                          <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <SourceBadge source={lead.source} />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* 1-Click WhatsApp Quick Icon */}
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors"
                            title="Open WhatsApp Chat / Call"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600" />
                          </a>

                          {lead.status === 'Pending' ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'Connected')}
                                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Mark Connected upon call"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Connected</span>
                              </button>
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'Not Connected')}
                                className="px-2 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-[11px] shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Mark Not Connected (Call did not connect)"
                              >
                                <PhoneMissed className="w-3 h-3" />
                                <span>Not Connected</span>
                              </button>
                            </div>
                          ) : lead.status === 'Not Connected' ? (
                            <div className="inline-flex items-center gap-1">
                              <StatusBadge status={lead.status} size="sm" />
                              <button
                                onClick={() => updateLeadStatus(lead.id, 'Connected')}
                                className="px-2 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-bold text-[11px] shadow-xs transition-all inline-flex items-center gap-1 cursor-pointer"
                                title="Mark Connected on retry"
                              >
                                <Phone className="w-3 h-3" />
                                <span>Connected</span>
                              </button>
                            </div>
                          ) : (
                            <StatusBadge status={lead.status} size="sm" />
                          )}

                          {!isAgent && (
                            <button
                              onClick={() => deleteLead(lead.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title="Remove lead from pipeline"
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
    </div>
  );
};
