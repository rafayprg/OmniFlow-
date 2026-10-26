import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useCrm } from '../context/CrmContext';
import { AssignmentBadge, SourceBadge } from './StatusBadge';
import { formatWhatsAppUrl, formatTelUrl, WhatsAppIcon } from '../utils/phoneUtils';
import { BUSINESS_CATEGORIES, getCategoryConfig, CategoryBadge } from '../utils/categoryUtils';
import { 
  Upload, 
  UserPlus, 
  CheckSquare, 
  Square, 
  Search, 
  Filter, 
  Database, 
  UserCheck, 
  ArrowRight, 
  Sparkles, 
  AlertCircle, 
  FileSpreadsheet, 
  Download, 
  ChevronDown, 
  Layers, 
  Inbox, 
  CheckCircle2, 
  Trash2, 
  RotateCcw,
  AlertTriangle,
  X,
  Phone,
  Clock,
  Briefcase
} from 'lucide-react';

export const CustomersModule = ({ onOpenUpload, searchQuery, setSearchQuery }) => {
  const { 
    customers, 
    agents, 
    assignCustomersToAgent, 
    deleteCustomers,
    deleteAllCustomers,
    unassignCustomers,
    updateCustomerCategory,
    analytics, 
    setActiveTab,
    addToast
  } = useCrm();

  // Selected customer IDs for bulk assignment / deletion
  const [selectedIds, setSelectedIds] = useState([]);
  // Selected agent to assign to
  const [selectedAgent, setSelectedAgent] = useState(agents[0]?.name || 'Bilal Ahmed');
  // Filter: 'ALL' | 'UNASSIGNED' | 'ASSIGNED'
  const [statusFilter, setStatusFilter] = useState('ALL');
  // Source filter
  const [sourceFilter, setSourceFilter] = useState('ALL');
  // Category filter
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // Confirmation modal state for deletion
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    targetIds: [],
    title: '',
    message: '',
    assignedCount: 0
  });

  // Calculate counts per business category safely
  const categoryCounts = useMemo(() => {
    const counts = {};
    (customers || []).forEach(c => {
      const cat = c?.category || 'General Business';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [customers]);

  // Filtered customer list (fully sanitized against null/undefined fields)
  const filteredCustomers = useMemo(() => {
    return (customers || []).filter(customer => {
      if (!customer) return false;
      const q = (searchQuery || '').toLowerCase().trim();
      const matchesSearch = !q ||
        (customer.name && customer.name.toLowerCase().includes(q)) ||
        (customer.phone && String(customer.phone).includes(q)) ||
        (customer.id && String(customer.id).toLowerCase().includes(q)) ||
        (customer.email && customer.email.toLowerCase().includes(q)) ||
        (customer.source && customer.source.toLowerCase().includes(q)) ||
        (customer.category && customer.category.toLowerCase().includes(q)) ||
        (customer.assignedTo && customer.assignedTo.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (statusFilter === 'UNASSIGNED' && customer.isAssigned) return false;
      if (statusFilter === 'ASSIGNED' && !customer.isAssigned) return false;

      if (sourceFilter !== 'ALL' && customer.source !== sourceFilter) return false;

      if (selectedCategory !== 'ALL') {
        const cat = customer.category || 'General Business';
        if (cat !== selectedCategory) return false;
      }

      return true;
    });
  }, [customers, searchQuery, statusFilter, sourceFilter, selectedCategory]);

  const uniqueSources = useMemo(() => {
    return Array.from(new Set((customers || []).map(c => c?.source).filter(Boolean)));
  }, [customers]);

  // Bulk select toggles
  const handleToggleSelectOne = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredCustomers.map(c => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every(id => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleSelectOnlyUnassigned = () => {
    const unassignedIds = filteredCustomers.filter(c => !c.isAssigned).map(c => c.id);
    setSelectedIds(unassignedIds);
  };

  const handleSelectOnlyAssigned = () => {
    const assignedIds = filteredCustomers.filter(c => c.isAssigned).map(c => c.id);
    setSelectedIds(assignedIds);
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  // Trigger bulk assignment
  const handleExecuteAssignment = () => {
    if (selectedIds.length === 0) return;
    const success = assignCustomersToAgent(selectedIds, selectedAgent);
    if (success) {
      setSelectedIds([]);
    }
  };

  const handleQuickAssignSingle = (customerId, agentName) => {
    assignCustomersToAgent([customerId], agentName);
  };

  // Open delete confirmation modal for bulk
  const handlePromptBulkDelete = () => {
    if (selectedIds.length === 0) return;
    const targetCustomers = customers.filter(c => selectedIds.includes(c.id));
    const assignedCount = targetCustomers.filter(c => c.isAssigned).length;

    setDeleteModalState({
      isOpen: true,
      targetIds: selectedIds,
      isWipeAll: false,
      title: `Delete ${selectedIds.length} Selected Customer(s)?`,
      message: `You are about to permanently delete ${selectedIds.length} customer record(s).`,
      assignedCount
    });
  };

  // Open delete confirmation modal for wipe all
  const handlePromptDeleteAll = () => {
    if (customers.length === 0) return;
    setDeleteModalState({
      isOpen: true,
      targetIds: [],
      isWipeAll: true,
      title: `Delete ALL ${customers.length} Customer Records?`,
      message: `This will permanently delete all ${customers.length} customer records and any active leads from Cloudflare R2 bucket and local cache. You can re-upload fresh Excel sheets anytime.`,
      assignedCount: analytics.assignedCustomersCount
    });
  };

  // Open delete confirmation modal for single row
  const handlePromptSingleDelete = (customer) => {
    setDeleteModalState({
      isOpen: true,
      targetIds: [customer.id],
      isWipeAll: false,
      title: `Delete "${customer.name}"?`,
      message: `This will remove customer record ${customer.id} from your database.`,
      assignedCount: customer.isAssigned ? 1 : 0
    });
  };

  // Confirm delete execution
  const handleConfirmDelete = () => {
    if (deleteModalState.isWipeAll) {
      deleteAllCustomers();
      setSelectedIds([]);
    } else {
      deleteCustomers(deleteModalState.targetIds);
      setSelectedIds(prev => prev.filter(id => !deleteModalState.targetIds.includes(id)));
    }
    setDeleteModalState({ isOpen: false, targetIds: [], title: '', message: '', assignedCount: 0, isWipeAll: false });
  };

  // Bulk unassign
  const handleExecuteBulkUnassign = () => {
    if (selectedIds.length === 0) return;
    unassignCustomers(selectedIds);
    setSelectedIds([]);
  };

  // Export Customers to real .xlsx Excel file
  const handleExportExcel = () => {
    const exportRows = filteredCustomers.map(c => ({
      "Customer ID": c.id,
      "Customer / Company Name": c.name,
      "Business Category": c.category || 'General Business',
      "Calling Timing": getCategoryConfig(c.category)?.timings || '9:00 AM – 6:00 PM',
      "Phone Number": c.phone,
      "Email Address": c.email || '',
      "Lead Source": c.source || '',
      "City": c.city || '',
      "Imported Date": c.importedDate || '',
      "Assignment Status": c.isAssigned ? "Assigned" : "Unassigned",
      "Assigned Agent": c.assignedTo || "None",
      "Assigned Timestamp": c.assignedAt || "N/A"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers_Pool");
    XLSX.writeFile(workbook, `OmniFlow_Customers_Export_${new Date().toISOString().split('T')[0]}.xlsx`);

    addToast({
      title: 'Excel Export Complete',
      message: `Exported ${exportRows.length} customers to .xlsx file.`,
      type: 'success'
    });
  };

  const allVisibleSelected = filteredCustomers.length > 0 && 
    filteredCustomers.every(c => selectedIds.includes(c.id));
  const someVisibleSelected = filteredCustomers.some(c => selectedIds.includes(c.id));

  // Count how many of the selected rows are assigned
  const selectedAssignedCount = useMemo(() => {
    return customers.filter(c => selectedIds.includes(c.id) && c.isAssigned).length;
  }, [customers, selectedIds]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* 1. CLEAN MODERN HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Customers Pool
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Import Excel/CSV spreadsheets, allocate leads to agents, or clean database.
          </p>
        </div>

        {/* Action Buttons: Upload & Export */}
        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <button
            onClick={onOpenUpload}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm shadow-blue-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Spreadsheet</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Download current customer list as .xlsx"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* 2. STATS PILLS & QUICK FILTERS (3-column responsive) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-3 sm:p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ALL' ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Pool
            </span>
            <Database className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-lg sm:text-2xl font-bold text-slate-800">{analytics.totalCustomersPool}</span>
            <span className="text-[10px] text-slate-400 font-medium hidden md:inline">records</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('UNASSIGNED')}
          className={`p-3 sm:p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${
            statusFilter === 'UNASSIGNED' ? 'border-amber-500 ring-2 ring-amber-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-amber-600">
              Unassigned
            </span>
            <Inbox className="w-3.5 h-3.5 text-amber-500 hidden sm:block" />
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-lg sm:text-2xl font-bold text-amber-600">{analytics.unassignedCount}</span>
            <span className="text-[10px] text-slate-400 font-medium hidden md:inline">ready</span>
          </div>
        </div>

        <div 
          onClick={() => setStatusFilter('ASSIGNED')}
          className={`p-3 sm:p-4 rounded-xl border bg-white shadow-xs cursor-pointer transition-all ${
            statusFilter === 'ASSIGNED' ? 'border-emerald-500 ring-2 ring-emerald-500/10' : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600">
              Assigned
            </span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-500 hidden sm:block" />
          </div>
          <div className="mt-1 sm:mt-2 flex items-baseline gap-1.5">
            <span className="text-lg sm:text-2xl font-bold text-emerald-600">{analytics.assignedCustomersCount}</span>
            <span className="text-[10px] text-slate-400 font-medium hidden md:inline">in pipeline</span>
          </div>
        </div>
      </div>

      {/* 3. ASSIGNMENT & DELETION ACTION BAR (ACTIVE WHEN CHECKBOXES TICKED) */}
      {selectedIds.length > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-4 rounded-xl shadow-lg border border-slate-700 flex flex-col lg:flex-row lg:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-2">
                <span>{selectedIds.length} customer record{selectedIds.length > 1 ? 's' : ''} selected</span>
                {selectedAssignedCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    {selectedAssignedCount} assigned
                  </span>
                )}
              </p>
              <p className="text-[11px] text-slate-300">
                You can assign them to an agent, unassign them, or permanently delete unneeded records.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Assign To Controls */}
            <div className="flex items-center gap-1.5 bg-white/10 px-2.5 py-1.5 rounded-lg border border-white/20">
              <span className="text-[11px] font-semibold text-blue-200">Assign To:</span>
              <select
                value={selectedAgent}
                onChange={(e) => setSelectedAgent(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-none cursor-pointer"
              >
                {(agents || []).map((agent) => (
                  <option key={agent.id} value={agent.name} className="text-slate-900">
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExecuteAssignment}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Assign</span>
            </button>

            {/* Unassign button (if assigned rows selected) */}
            {selectedAssignedCount > 0 && (
              <button
                onClick={handleExecuteBulkUnassign}
                className="px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-400/30 font-semibold text-xs transition-all flex items-center gap-1"
                title="Return assigned customers back to Unassigned Pool"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                <span>Unassign ({selectedAssignedCount})</span>
              </button>
            )}

            {/* DELETE BUTTON (REQUIRED BY USER) */}
            <button
              onClick={handlePromptBulkDelete}
              className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              title="Delete selected customers from database and clean up their pipeline leads"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected ({selectedIds.length})</span>
            </button>

            <button
              onClick={handleClearSelection}
              className="px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* 3.5 BUSINESS CATEGORY CALLING TIMINGS FILTER BUTTONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-extrabold text-slate-800 text-xs">Business Category Filter</span>
              <span className="text-[11px] text-slate-400 ml-1.5 hidden sm:inline">• Target companies by office & calling hours</span>
            </div>
          </div>
          {selectedCategory !== 'ALL' && (
            <button
              onClick={() => setSelectedCategory('ALL')}
              className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
            >
              Reset to All ({customers.length})
            </button>
          )}
        </div>

        {/* Scrollable Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/25'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <span>🏢 All Categories</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}`}>
              {customers.length}
            </span>
          </button>

          {BUSINESS_CATEGORIES.map(cat => {
            const count = categoryCounts[cat.id] || 0;
            const isSelected = selectedCategory === cat.id;
            const Icon = cat.icon || Briefcase;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                  isSelected
                    ? `${cat.activeClass || 'bg-blue-600 text-white border-blue-600'} shadow-sm shadow-blue-500/25`
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
                title={`${cat.label} - Optimal Calling Hours: ${cat.timings}`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{cat.shortLabel || cat.label}</span>
                <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  ⏰ {cat.timings}
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. TABLE CONTROLS & SELECTION SHORTCUTS */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <button
            onClick={handleSelectAllVisible}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-semibold text-slate-700 transition-colors"
          >
            {allVisibleSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
            ) : someVisibleSelected ? (
              <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span>Select All Visible ({filteredCustomers.length})</span>
          </button>

          <button
            onClick={handleSelectOnlyUnassigned}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50/60 hover:bg-amber-100/60 font-semibold text-amber-800 transition-colors"
          >
            <span>Select Only Unassigned ({analytics.unassignedCount})</span>
          </button>

          <button
            onClick={handleSelectOnlyAssigned}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100/60 font-semibold text-emerald-800 transition-colors"
          >
            <span>Select Only Assigned ({analytics.assignedCustomersCount})</span>
          </button>

          {customers.length > 0 && (
            <button
              onClick={handlePromptDeleteAll}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50/70 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition-colors cursor-pointer"
              title="Permanently wipe all customer records and linked leads from Cloudflare R2 database"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete All Records ({customers.length})</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Categories ({customers.length})</option>
            {BUSINESS_CATEGORIES.map(cat => (
              <option key={cat.id} value={cat.id}>
                {cat.label} ({categoryCounts[cat.id] || 0})
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Records ({customers.length})</option>
            <option value="UNASSIGNED">Unassigned Only ({analytics.unassignedCount})</option>
            <option value="ASSIGNED">Assigned Only ({analytics.assignedCustomersCount})</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Sources</option>
            {uniqueSources.map(src => (
              <option key={src} value={src}>{src}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 5. MOBILE VIEW: TOUCH CARDS FOR CUSTOMERS (Shown on phones) */}
      <div className="block md:hidden space-y-3">
        {filteredCustomers.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400">
            <Database className="w-8 h-8 mx-auto mb-2 opacity-40 text-blue-600" />
            <p className="font-semibold text-slate-700 text-sm">No customers in pool</p>
            <p className="text-xs text-slate-400 mt-1">Upload an Excel spreadsheet or add a single customer.</p>
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const isSelected = selectedIds.includes(cust.id);
            const waUrl = formatWhatsAppUrl(cust.phone);
            const telUrl = formatTelUrl(cust.phone);

            return (
              <div 
                key={cust.id} 
                className={`bg-white rounded-2xl border transition-all p-4 shadow-xs space-y-3 ${
                  isSelected 
                    ? 'border-blue-400 bg-blue-50/30' 
                    : cust.isAssigned 
                    ? 'border-slate-200 bg-white' 
                    : 'border-amber-200/70 bg-amber-50/10'
                }`}
              >
                {/* Header: Checkbox + Name + ID */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelectOne(cust.id)}
                      className="w-4 h-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-extrabold text-slate-900 text-sm leading-snug">
                          {cust.name}
                        </span>
                        <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {cust.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate mt-0.5">
                        {cust.email || 'No email'} {cust.city ? `• ${cust.city}` : ''}
                      </p>
                      <div className="mt-1">
                        <CategoryBadge category={cust.category} />
                      </div>
                    </div>
                  </div>

                  <SourceBadge source={cust.source} />
                </div>

                {/* Direct Phone Display (Clicking pushes to WhatsApp) */}
                <div className="flex items-center justify-between text-xs bg-slate-50/80 px-3 py-2 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-[11px] font-medium">Phone:</span>
                    <a
                      href={waUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono font-bold text-emerald-700 hover:text-emerald-800 text-sm tracking-wide flex items-center gap-1.5"
                      title="Tap to open WhatsApp"
                    >
                      <WhatsAppIcon className="w-4 h-4 fill-emerald-600" />
                      <span>{cust.phone}</span>
                    </a>
                  </div>

                  <AssignmentBadge 
                    isAssigned={cust.isAssigned} 
                    assignedTo={cust.assignedTo} 
                  />
                </div>

                {/* 1-Tap Action Buttons (WhatsApp + Call) */}
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

                {/* Bottom Row: Quick Assign or View Lead */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  {!cust.isAssigned ? (
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        if (e.target.value) {
                          handleQuickAssignSingle(cust.id, e.target.value);
                          e.target.value = "";
                        }
                      }}
                      className="flex-1 py-1.5 px-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none"
                    >
                      <option value="" disabled>Assign to Agent...</option>
                      {(agents || []).map((agent) => (
                        <option key={agent.id} value={agent.name}>
                          {agent.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <button
                      onClick={() => setActiveTab('leads')}
                      className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800"
                    >
                      <span>Pipeline: {cust.assignedTo}</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={() => handlePromptSingleDelete(cust)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                    title="Delete record"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 6. DESKTOP VIEW: FULL TABLE (Hidden on mobile phones, shown on md and up) */}
      <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={handleSelectAllVisible}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                  />
                </th>
                <th className="py-3.5 px-4">Customer ID</th>
                <th className="py-3.5 px-5">Customer Name & Email</th>
                <th className="py-3.5 px-4">Category & Hours</th>
                <th className="py-3.5 px-4">Phone / WhatsApp</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-5">Assignment Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <Database className="w-10 h-10 mx-auto mb-3 opacity-30 text-blue-600" />
                    <p className="font-bold text-slate-700 text-sm">No customers in pool</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                      All test records have been cleared. Upload your Excel/CSV spreadsheet to get started.
                    </p>
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <button
                        onClick={onOpenUpload}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-blue-500/25 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Excel (.xlsx / .csv)</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = selectedIds.includes(cust.id);
                  const waUrl = formatWhatsAppUrl(cust.phone);
                  const telUrl = formatTelUrl(cust.phone);

                  return (
                    <tr
                      key={cust.id}
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? 'bg-blue-50/40' : !cust.isAssigned ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOne(cust.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
                        />
                      </td>

                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500">
                        {cust.id}
                      </td>

                      <td className="py-3.5 px-5">
                        <div>
                          <p className="font-bold text-slate-900 text-sm leading-tight">
                            {cust.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate max-w-xs">
                            {cust.email || 'No email'} • <span className="text-slate-500">{cust.city}</span>
                          </p>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <CategoryBadge category={cust.category} />
                      </td>

                      {/* Phone with WhatsApp & Call Action */}
                      <td className="py-3.5 px-4 font-mono font-semibold">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors"
                            title="Click to WhatsApp Chat / Call"
                          >
                            <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 shrink-0" />
                            <span>{cust.phone}</span>
                          </a>

                          <a
                            href={telUrl}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Direct Phone Call"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <SourceBadge source={cust.source} />
                      </td>

                      <td className="py-3.5 px-5">
                        <AssignmentBadge 
                          isAssigned={cust.isAssigned} 
                          assignedTo={cust.assignedTo} 
                        />
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center justify-end gap-2">
                          {!cust.isAssigned ? (
                            <select
                              defaultValue=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handleQuickAssignSingle(cust.id, e.target.value);
                                  e.target.value = "";
                                }
                              }}
                              className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-all cursor-pointer focus:outline-none"
                            >
                              <option value="" disabled>Assign To...</option>
                              {(agents || []).map((agent) => (
                                <option key={agent.id} value={agent.name}>
                                  {agent.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <button
                              onClick={() => setActiveTab('leads')}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                              title="View in Leads Pipeline"
                            >
                              <span>View Lead</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          )}

                          {/* Individual Row Delete Button */}
                          <button
                            onClick={() => handlePromptSingleDelete(cust)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete this customer record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* 6. DELETE CONFIRMATION MODAL */}
      {deleteModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center ring-8 ring-rose-50">
                <AlertTriangle className="w-7 h-7" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900">
                  {deleteModalState.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {deleteModalState.message}
                </p>
              </div>

              {deleteModalState.assignedCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span>Active Leads Cleanup:</span>
                  </div>
                  <p className="text-[11px] text-amber-700">
                    <strong>{deleteModalState.assignedCount}</strong> of these customer(s) are currently assigned in the Leads pipeline. Deleting them will automatically remove them from the pipeline and update your Dashboard counts.
                  </p>
                </div>
              )}

              <div className="pt-2 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteModalState({ isOpen: false, targetIds: [], title: '', message: '', assignedCount: 0, isWipeAll: false })}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/30 transition-all flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleteModalState.isWipeAll ? 'Yes, Delete All Records' : 'Yes, Delete Record(s)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
