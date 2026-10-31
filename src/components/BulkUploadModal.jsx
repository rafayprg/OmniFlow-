import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useCrm } from '../context/CrmContext';
import { BUSINESS_CATEGORIES, detectCategory } from '../utils/categoryUtils';
import { 
  X, 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  FileCheck, 
  Download, 
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Layers,
  ClipboardPaste
} from 'lucide-react';
import { 
  SocialLinksBadges, 
  ReviewsRating, 
  AddressLocation 
} from '../utils/socialUtils';

export const BulkUploadModal = ({ isOpen, onClose, onFinishGoToCustomers, initialTarget = 'leads' }) => {
  const { bulkUploadLeads, bulkUploadCustomers, setActiveTab, addToast, agents, auth } = useCrm();

  const fileInputRef = useRef(null);

  // Mode: 'leads' (Direct to Leads Pipeline) vs 'customers' (Raw Customers Pool)
  const [importTarget, setImportTarget] = useState(initialTarget);
  // Input method: 'file' | 'paste'
  const [inputMethod, setInputMethod] = useState('file');
  const [pastedText, setPastedText] = useState('');

  // States
  const [fileData, setFileData] = useState(null); // { fileName, fileSize, sheetNames, selectedSheet, rawRows, headers }
  const [assignedAgent, setAssignedAgent] = useState('Unassigned');
  const [initialStatus, setInitialStatus] = useState('Pending');
  
  // Dynamic column mapping for all 7 key sections
  const [columnMapping, setColumnMapping] = useState({
    // 1. Business Name
    name: '',
    contactPerson: '',
    
    // 2. Contact
    phone: '',
    email: '',
    
    // 3. Address
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    
    // 4. Industry
    industry: '',
    category: '',
    
    // 5. Socials
    instagram: '',
    facebook: '',
    linkedin: '',
    tiktok: '',
    youtube: '',
    twitter: '',
    socialsCombined: '',
    
    // 6. Website
    website: '',
    
    // 7. Reviews
    rating: '',
    reviewCount: '',
    reviews: ''
  });

  const [batchCategory, setBatchCategory] = useState('AUTO'); // 'AUTO' or specific category id
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewTab, setPreviewTab] = useState('organized'); // 'organized' | 'mapping'

  // Auto-detect columns based on header strings with comprehensive regex patterns
  const autoDetectColumns = (headers) => {
    const mapping = {
      name: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      industry: '',
      category: '',
      instagram: '',
      facebook: '',
      linkedin: '',
      tiktok: '',
      youtube: '',
      twitter: '',
      socialsCombined: '',
      website: '',
      rating: '',
      reviewCount: '',
      reviews: ''
    };

    headers.forEach(h => {
      const lower = String(h).toLowerCase().trim().replace(/[_-]/g, ' ');

      // 1. Business Name
      if (!mapping.name && /^(name|business name|company|company name|firm|store|title|place name|client|customer name|business)$/i.test(lower)) {
        mapping.name = h;
      } else if (!mapping.contactPerson && /^(contact person|person|contact name|owner|manager|founder|rep)$/i.test(lower)) {
        mapping.contactPerson = h;
      }
      
      // 2. Contact
      else if (!mapping.phone && /(phone|mobile|cell|contact number|tel|whatsapp|number)$/i.test(lower)) {
        mapping.phone = h;
      } else if (!mapping.email && /(email|mail|e mail|contact email)$/i.test(lower)) {
        mapping.email = h;
      }

      // 3. Address
      else if (!mapping.address && /(full address|street address|address|formatted address|place address|location address)$/i.test(lower)) {
        mapping.address = h;
      } else if (!mapping.city && /^(city|town|district)$/i.test(lower)) {
        mapping.city = h;
      } else if (!mapping.state && /^(state|province|region)$/i.test(lower)) {
        mapping.state = h;
      } else if (!mapping.postalCode && /^(zip|zipcode|postal|postal code|post code)$/i.test(lower)) {
        mapping.postalCode = h;
      } else if (!mapping.country && /^(country|nation)$/i.test(lower)) {
        mapping.country = h;
      }

      // 4. Industry
      else if (!mapping.industry && /(industry|category|categories|business type|sector|niche|primary type|sub category)$/i.test(lower)) {
        mapping.industry = h;
        mapping.category = h;
      }

      // 5. Socials
      else if (!mapping.instagram && /(instagram|insta|ig url|instagram url|ig)$/i.test(lower)) {
        mapping.instagram = h;
      } else if (!mapping.facebook && /(facebook|fb|fb page|facebook url|fb url)$/i.test(lower)) {
        mapping.facebook = h;
      } else if (!mapping.linkedin && /(linkedin|li|linkedin url)$/i.test(lower)) {
        mapping.linkedin = h;
      } else if (!mapping.tiktok && /(tiktok|tt|tiktok url)$/i.test(lower)) {
        mapping.tiktok = h;
      } else if (!mapping.youtube && /(youtube|yt|youtube channel)$/i.test(lower)) {
        mapping.youtube = h;
      } else if (!mapping.twitter && /(twitter|x|twitter url)$/i.test(lower)) {
        mapping.twitter = h;
      } else if (!mapping.socialsCombined && /(socials|social media|social links|profiles)$/i.test(lower)) {
        mapping.socialsCombined = h;
      }

      // 6. Website
      else if (!mapping.website && /(website|web|url|site|domain|homepage|web link)$/i.test(lower)) {
        mapping.website = h;
      }

      // 7. Reviews
      else if (!mapping.rating && /(rating|stars|score|google rating|average rating|review rating)$/i.test(lower)) {
        mapping.rating = h;
      } else if (!mapping.reviewCount && /(reviews count|review count|total reviews|num reviews|num of reviews|reviews)$/i.test(lower)) {
        mapping.reviewCount = h;
      } else if (!mapping.reviews && /(review snippet|reviews text|testimonial|feedback|review)$/i.test(lower)) {
        mapping.reviews = h;
      }
    });

    // Broad fallback if name wasn't detected
    if (!mapping.name) {
      const candidate = headers.find(h => /name|company|title|store/i.test(h)) || headers[0];
      if (candidate) mapping.name = candidate;
    }
    // Broad fallback for phone
    if (!mapping.phone) {
      const candidate = headers.find(h => /phone|contact|mobile|cell/i.test(h)) || (headers.length > 1 ? headers[1] : '');
      if (candidate) mapping.phone = candidate;
    }

    return mapping;
  };

  // Process rows and headers
  const setParsedData = (fileName, fileSize, workbook, sheetNames, selectedSheet, rawRows) => {
    if (!rawRows || rawRows.length === 0) {
      setErrorMsg('No data rows found in this sheet. Please ensure it has header and data rows.');
      setIsProcessing(false);
      return;
    }

    const headers = Object.keys(rawRows[0]);
    const detectedMapping = autoDetectColumns(headers);

    setFileData({
      fileName,
      fileSize,
      workbook,
      sheetNames,
      selectedSheet,
      rawRows,
      headers
    });

    setColumnMapping(detectedMapping);
    setIsProcessing(false);
  };

  // Handle file drop/upload
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellDates: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        setParsedData(
          file.name,
          (file.size / 1024).toFixed(1) + ' KB',
          workbook,
          workbook.SheetNames,
          firstSheetName,
          rawJson
        );
      } catch (err) {
        console.error('File parse error:', err);
        setErrorMsg('Could not parse this file. Please verify it is a valid .xlsx, .xls, or .csv document.');
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setErrorMsg('Failed to read file from disk.');
      setIsProcessing(false);
    };

    reader.readAsBinaryString(file);
  };

  // Handle pasted tabular data (from Google Sheets or Excel copy-paste)
  const handleProcessPastedData = () => {
    if (!pastedText.trim()) {
      setErrorMsg('Please paste some tabular data or CSV text first.');
      return;
    }

    setErrorMsg('');
    setIsProcessing(true);

    try {
      // Use SheetJS to read pasted text directly as CSV/TSV
      const workbook = XLSX.read(pastedText, { type: 'string' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawJson || rawJson.length === 0) {
        setErrorMsg('Could not detect columns and rows from the pasted text. Try copying directly from Google Sheets or Excel.');
        setIsProcessing(false);
        return;
      }

      setParsedData(
        'Pasted_Spreadsheet_Data',
        `${(pastedText.length / 1024).toFixed(1)} KB text`,
        workbook,
        workbook.SheetNames,
        firstSheetName,
        rawJson
      );
    } catch (err) {
      console.error('Pasted text parse error:', err);
      setErrorMsg('Failed to parse pasted data. Please check formatting.');
      setIsProcessing(false);
    }
  };

  // Switch sheet if multi-sheet Excel
  const handleSheetChange = (sheetName) => {
    if (!fileData?.workbook) return;
    try {
      const worksheet = fileData.workbook.Sheets[sheetName];
      const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (rawJson.length > 0) {
        const headers = Object.keys(rawJson[0]);
        setFileData(prev => ({
          ...prev,
          selectedSheet: sheetName,
          rawRows: rawJson,
          headers
        }));
        setColumnMapping(autoDetectColumns(headers));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to extract social handles/URLs from any text
  const extractSocialLinks = (row) => {
    const socials = {};
    const textBlob = Object.values(row).join(' ');

    if (!columnMapping.instagram) {
      const igMatch = textBlob.match(/(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/i);
      if (igMatch) socials.instagram = igMatch[0];
    }
    if (!columnMapping.facebook) {
      const fbMatch = textBlob.match(/(?:https?:\/\/)?(?:www\.)?facebook\.com\/([a-zA-Z0-9_.-]+)/i);
      if (fbMatch) socials.facebook = fbMatch[0];
    }
    if (!columnMapping.linkedin) {
      const liMatch = textBlob.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|company)\/([a-zA-Z0-9_-]+)/i);
      if (liMatch) socials.linkedin = liMatch[0];
    }
    if (!columnMapping.tiktok) {
      const ttMatch = textBlob.match(/(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@([a-zA-Z0-9_.]+)/i);
      if (ttMatch) socials.tiktok = ttMatch[0];
    }

    return socials;
  };

  // Generate organized lead records from parsed rows
  const organizedPreviewRecords = useMemo(() => {
    if (!fileData?.rawRows?.length || !columnMapping.name) return [];

    return fileData.rawRows.map((row, idx) => {
      // 1. Business Name
      const name = String(row[columnMapping.name] || '').trim();
      if (!name) return null;

      const contactPerson = columnMapping.contactPerson && row[columnMapping.contactPerson]
        ? String(row[columnMapping.contactPerson]).trim()
        : '';

      // 2. Contact
      const phone = columnMapping.phone && row[columnMapping.phone]
        ? String(row[columnMapping.phone]).trim()
        : '0300-0000000';
      const email = columnMapping.email && row[columnMapping.email]
        ? String(row[columnMapping.email]).trim()
        : '';

      // 3. Address
      const address = columnMapping.address && row[columnMapping.address]
        ? String(row[columnMapping.address]).trim()
        : '';
      const city = columnMapping.city && row[columnMapping.city]
        ? String(row[columnMapping.city]).trim()
        : 'Karachi';
      const state = columnMapping.state && row[columnMapping.state]
        ? String(row[columnMapping.state]).trim()
        : '';
      const postalCode = columnMapping.postalCode && row[columnMapping.postalCode]
        ? String(row[columnMapping.postalCode]).trim()
        : '';
      const country = columnMapping.country && row[columnMapping.country]
        ? String(row[columnMapping.country]).trim()
        : 'Pakistan';

      // 4. Industry
      const colCat = columnMapping.category && row[columnMapping.category]
        ? String(row[columnMapping.category]).trim()
        : (columnMapping.industry && row[columnMapping.industry] ? String(row[columnMapping.industry]).trim() : '');
      const industry = colCat || (batchCategory !== 'AUTO' ? batchCategory : detectCategory(name));
      const category = industry;

      // 5. Socials
      const autoExtracted = extractSocialLinks(row);
      const instagram = (columnMapping.instagram && row[columnMapping.instagram] ? String(row[columnMapping.instagram]).trim() : '') || autoExtracted.instagram || '';
      const facebook = (columnMapping.facebook && row[columnMapping.facebook] ? String(row[columnMapping.facebook]).trim() : '') || autoExtracted.facebook || '';
      const linkedin = (columnMapping.linkedin && row[columnMapping.linkedin] ? String(row[columnMapping.linkedin]).trim() : '') || autoExtracted.linkedin || '';
      const tiktok = (columnMapping.tiktok && row[columnMapping.tiktok] ? String(row[columnMapping.tiktok]).trim() : '') || autoExtracted.tiktok || '';
      const youtube = columnMapping.youtube && row[columnMapping.youtube] ? String(row[columnMapping.youtube]).trim() : '';
      const twitter = columnMapping.twitter && row[columnMapping.twitter] ? String(row[columnMapping.twitter]).trim() : '';

      // 6. Website
      const website = columnMapping.website && row[columnMapping.website]
        ? String(row[columnMapping.website]).trim()
        : '';

      // 7. Reviews
      const ratingRaw = columnMapping.rating && row[columnMapping.rating] !== undefined ? row[columnMapping.rating] : null;
      const reviewCountRaw = columnMapping.reviewCount && row[columnMapping.reviewCount] !== undefined ? row[columnMapping.reviewCount] : null;
      const reviews = columnMapping.reviews && row[columnMapping.reviews] ? String(row[columnMapping.reviews]).trim() : '';

      // All remaining unmapped columns preserved in rawDetails
      const mappedColValues = new Set(Object.values(columnMapping).filter(Boolean));
      const rawDetails = {};
      Object.keys(row).forEach(key => {
        if (!mappedColValues.has(key)) {
          rawDetails[key] = row[key];
        }
      });

      return {
        name,
        contactPerson,
        phone,
        email,
        address,
        city,
        state,
        postalCode,
        country,
        industry,
        category,
        website,
        instagram,
        facebook,
        linkedin,
        tiktok,
        youtube,
        twitter,
        rating: ratingRaw,
        reviewCount: reviewCountRaw,
        reviews,
        rawDetails,
        assignedAgent: assignedAgent === 'Unassigned' ? (auth?.name || 'Unassigned') : assignedAgent,
        status: initialStatus,
        source: fileData.fileName ? `Sheet: ${fileData.fileName}` : 'Raw Spreadsheet Upload',
        notes: `Imported with ${Object.keys(rawDetails).length} raw sheet columns preserved.`
      };
    }).filter(Boolean);
  }, [fileData, columnMapping, batchCategory, assignedAgent, initialStatus, auth]);

  if (!isOpen) return null;

  // Execute import of the parsed data
  const handleConfirmImport = async () => {
    if (!organizedPreviewRecords.length) {
      setErrorMsg('No valid rows could be extracted. Please check the Business Name mapping.');
      return;
    }

    setIsProcessing(true);

    try {
      if (importTarget === 'leads') {
        const result = await bulkUploadLeads(organizedPreviewRecords, fileData.fileName || 'Raw_Data_Upload.xlsx');
        setImportedCount(result.length);
        setImportSuccess(true);
      } else {
        // Customer Pool import
        const custRecords = organizedPreviewRecords.map(r => ({
          name: r.name,
          phone: r.phone,
          email: r.email,
          city: r.city,
          category: r.category,
          source: r.source
        }));
        const result = await bulkUploadCustomers(custRecords, fileData.fileName || 'Customers_Upload.xlsx');
        setImportedCount(result.length);
        setImportSuccess(true);
      }
    } catch (err) {
      console.error('Import execution error:', err);
      setErrorMsg(err.message || 'Error occurred while saving records.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate and download a sample Excel template with all 7 sections
  const handleDownloadComprehensiveTemplate = () => {
    const templateData = [
      {
        "Business Name": "Apex Tech Solutions",
        "Contact Person": "Kamran Khan",
        "Phone Number": "0300-1122334",
        "Email Address": "contact@apextech.pk",
        "Full Address": "Suite 402, Shahrah-e-Faisal",
        "City": "Karachi",
        "State": "Sindh",
        "Postal Code": "75350",
        "Country": "Pakistan",
        "Industry / Category": "Software & Tech",
        "Website": "https://apextech.pk",
        "Instagram": "@apextechpk",
        "Facebook": "facebook.com/apextechpk",
        "LinkedIn": "linkedin.com/company/apex-tech-pk",
        "TikTok": "@apextech_official",
        "YouTube": "@apextech_pk",
        "Twitter": "@apextech_pk",
        "Rating": 4.8,
        "Total Reviews": 142,
        "Reviews Feedback": "Outstanding B2B software services, delivered on time.",
        "Operating Hours": "10:00 AM - 7:00 PM",
        "Google Maps Place ID": "ChIJb_apextech123"
      },
      {
        "Business Name": "Indus Pearl Restaurant",
        "Contact Person": "Chef Tariq",
        "Phone Number": "0321-9988776",
        "Email Address": "info@induspearl.com",
        "Full Address": "Plot 12-C, MM Alam Road, Gulberg",
        "City": "Lahore",
        "State": "Punjab",
        "Postal Code": "54000",
        "Country": "Pakistan",
        "Industry / Category": "Restaurants & Food",
        "Website": "https://induspearl.com",
        "Instagram": "@induspearl_lhr",
        "Facebook": "facebook.com/induspearl",
        "LinkedIn": "",
        "TikTok": "@induspearl_food",
        "YouTube": "",
        "Twitter": "",
        "Rating": 4.5,
        "Total Reviews": 890,
        "Reviews Feedback": "Best traditional feast in Lahore, superb ambiance.",
        "Operating Hours": "1:00 PM - 12:00 AM",
        "Google Maps Place ID": "ChIJ_induspearl456"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Leads_Template_7_Sections");
    XLSX.writeFile(workbook, "OmniFlow_Leads_7_Sections_Template.xlsx");

    addToast({
      title: 'Template Downloaded',
      message: 'OmniFlow_Leads_7_Sections_Template.xlsx saved to your computer.',
      type: 'success'
    });
  };

  const handleResetAndClose = () => {
    setFileData(null);
    setPastedText('');
    setImportSuccess(false);
    setErrorMsg('');
    onClose();
  };

  const handleFinish = () => {
    handleResetAndClose();
    if (importTarget === 'leads') {
      setActiveTab('leads');
    } else if (onFinishGoToCustomers) {
      onFinishGoToCustomers();
    } else {
      setActiveTab('customers');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-4xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900">
                  Raw Data Auto-Organizer & Ingest Engine
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  AI & Auto-Clean
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Upload any raw spreadsheet or paste data — automatically formats <strong>Business, Contact, Address, Industry, Socials, Website & Reviews</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={handleResetAndClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Notice</p>
                <p className="text-[11px] mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {!importSuccess ? (
            <>
              {/* Target & Input Method Switcher (When no file loaded yet) */}
              {!fileData ? (
                <div className="space-y-4">
                  {/* Destination Selector */}
                  <div className="p-3.5 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="font-extrabold text-slate-900 text-xs">Where should this raw data be added?</span>
                      <p className="text-[11px] text-slate-500">
                        Choose whether to populate your ready-to-call Leads Pipeline or Master Customer Pool.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs shrink-0">
                      <button
                        type="button"
                        onClick={() => setImportTarget('leads')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          importTarget === 'leads'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        ⚡ Leads Pipeline (Calling Team)
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportTarget('customers')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          importTarget === 'customers'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        📂 Customers Master Pool
                      </button>
                    </div>
                  </div>

                  {/* Input Mode Tabs: File Upload vs Direct Paste */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setInputMethod('file')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        inputMethod === 'file'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Upload File (.xlsx, .csv)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInputMethod('paste')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        inputMethod === 'paste'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <ClipboardPaste className="w-3.5 h-3.5" />
                      <span>Paste Raw Data (Excel / Google Sheets)</span>
                    </button>
                  </div>

                  {/* Option 1: File Upload Box */}
                  {inputMethod === 'file' ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-blue-300 hover:border-blue-500 bg-blue-50/20 hover:bg-blue-50/40 rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all group"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                        <Upload className="w-7 h-7" />
                      </div>
                      <div className="mt-3 space-y-1">
                        <h4 className="text-sm font-bold text-slate-800">
                          Click to select your raw file or drag and drop here
                        </h4>
                        <p className="text-xs text-slate-500">
                          Supports <strong>.XLSX, .XLS, and .CSV</strong> spreadsheets (Scrapers, Directories, B2B lists)
                        </p>
                      </div>
                      <div className="pt-3">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-blue-700 font-semibold border border-blue-200 shadow-xs text-xs">
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          Browse Files
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Option 2: Direct Paste Box */
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <span className="font-bold text-slate-800 text-xs">
                          Paste Tabular Data directly from Google Sheets or Excel:
                        </span>
                        <p className="text-[11px] text-slate-400">
                          Select your rows in Google Sheets or Excel, press <kbd className="px-1 py-0.5 bg-white border rounded font-mono">Ctrl+C</kbd>, and paste here.
                        </p>
                      </div>

                      <textarea
                        rows={6}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder={`Business Name\tPhone Number\tEmail\tAddress\tCity\tIndustry\tWebsite\tRating\nApex Tech\t03001122334\tcontact@apex.pk\tShahrah-e-Faisal\tKarachi\tSoftware\thttps://apex.pk\t4.8`}
                        className="w-full text-xs font-mono p-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />

                      <button
                        type="button"
                        onClick={handleProcessPastedData}
                        disabled={!pastedText.trim() || isProcessing}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Parse & Organize Pasted Data</span>
                      </button>
                    </div>
                  )}

                  {/* Template download & Help row */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div>
                      <p className="font-bold text-slate-800">Need a sample format with all 7 sections?</p>
                      <p className="text-[11px] text-slate-500">
                        Includes: Business Name, Contact, Address, Industry, Socials, Website, and Reviews columns.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadComprehensiveTemplate}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Download Sample Template (.xlsx)</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: FILE LOADED - PREVIEW & MAPPING */
                <div className="space-y-4">
                  
                  {/* File Metadata Banner */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">
                          {fileData.fileName} <span className="text-slate-400 font-normal">({fileData.fileSize})</span>
                        </p>
                        <p className="text-[11px] text-emerald-800 font-medium">
                          Parsed <strong>{fileData.rawRows.length} rows</strong> across <strong>{fileData.headers.length} columns</strong>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setFileData(null);
                          setPastedText('');
                          setErrorMsg('');
                        }}
                        className="text-xs text-slate-500 hover:text-slate-800 font-semibold underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Upload different data</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-Sheet Selector if applicable */}
                  {fileData.sheetNames?.length > 1 && (
                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span className="font-bold text-slate-700">Select Sheet:</span>
                      <select
                        value={fileData.selectedSheet}
                        onChange={(e) => handleSheetChange(e.target.value)}
                        className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      >
                        {fileData.sheetNames.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Pipeline Ingestion Settings */}
                  {importTarget === 'leads' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                          Assign Leads To
                        </label>
                        <select
                          value={assignedAgent}
                          onChange={(e) => setAssignedAgent(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                        >
                          <option value="Unassigned">Unassigned (Team Pool)</option>
                          {agents.map(a => (
                            <option key={a.id} value={a.name}>{a.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                          Initial Status
                        </label>
                        <select
                          value={initialStatus}
                          onChange={(e) => setInitialStatus(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                        >
                          <option value="Pending">1. Pending (Awaiting Call)</option>
                          <option value="Connected">2. Connected</option>
                          <option value="Interested">3. Interested 🔥</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                          Industry Categorization
                        </label>
                        <select
                          value={batchCategory}
                          onChange={(e) => setBatchCategory(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800"
                        >
                          <option value="AUTO">✨ Auto-Detect from Sheet / Name</option>
                          {BUSINESS_CATEGORIES.map(c => (
                            <option key={c.id} value={c.id}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* View Tabs: Organized Leads Preview vs Column Mapping */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewTab('organized')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          previewTab === 'organized'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Organized Leads Preview ({organizedPreviewRecords.length})</span>
                      </button>

                      <button
                        onClick={() => setPreviewTab('mapping')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          previewTab === 'mapping'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Adjust 7 Sections Mapping</span>
                      </button>
                    </div>

                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                      ✓ All extra columns preserved
                    </span>
                  </div>

                  {/* TAB A: ORGANIZED PREVIEW CARDS */}
                  {previewTab === 'organized' ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-slate-500 text-[11px]">
                        <span>Showing sample of how your raw data is organized across the 7 sections:</span>
                        <span className="font-bold text-slate-700">Previewing first 5 rows</span>
                      </div>

                      <div className="space-y-3">
                        {organizedPreviewRecords.slice(0, 5).map((lead, i) => (
                          <div 
                            key={i} 
                            className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-2xs space-y-2.5 hover:border-blue-300 transition-colors"
                          >
                            {/* Header: Name, Contact Person, Industry */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-extrabold text-slate-900 text-sm">{lead.name}</h5>
                                {lead.contactPerson && (
                                  <span className="text-[11px] text-slate-500 font-medium">
                                    Contact Person: <strong className="text-slate-700">{lead.contactPerson}</strong>
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {lead.industry}
                              </span>
                            </div>

                            {/* Grid of the 7 sections */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                              {/* Contact */}
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Contact</span>
                                <p className="font-mono font-bold text-emerald-800">{lead.phone}</p>
                                {lead.email && <p className="text-slate-500 truncate">{lead.email}</p>}
                              </div>

                              {/* Address */}
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Address</span>
                                <AddressLocation address={lead.address} city={lead.city} state={lead.state} compact={true} />
                              </div>

                              {/* Reviews & Socials */}
                              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                                <span className="text-[9px] uppercase font-bold text-slate-400 block">Reputation & Socials</span>
                                <ReviewsRating rating={lead.rating} reviewCount={lead.reviewCount} compact={true} />
                                <SocialLinksBadges lead={lead} size="xs" />
                              </div>
                            </div>

                            {/* Extra Columns Notice */}
                            {Object.keys(lead.rawDetails).length > 0 && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1.5 pt-0.5 border-t border-slate-100">
                                <Layers className="w-3 h-3 text-blue-500" />
                                <span>
                                  <strong>{Object.keys(lead.rawDetails).length} additional sheet columns</strong> stored in raw details: {Object.keys(lead.rawDetails).slice(0, 4).join(', ')}...
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    /* TAB B: COLUMN MAPPING CONFIGURATOR */
                    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">
                          Spreadsheet Column Mapping (The 7 Core Sections)
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Confirm which column from your spreadsheet corresponds to each field:
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {/* 1. Business Name */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            🏢 1. Business / Company Name <span className="text-rose-500">*</span>
                          </label>
                          <select
                            value={columnMapping.name}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- Select Column --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Contact Person */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            👤 Contact Person / Owner
                          </label>
                          <select
                            value={columnMapping.contactPerson}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, contactPerson: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* 2. Phone */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            📞 2. Contact Phone (WhatsApp)
                          </label>
                          <select
                            value={columnMapping.phone}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, phone: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- Select Column --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Email */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            ✉️ Contact Email
                          </label>
                          <select
                            value={columnMapping.email}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* 3. Address */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            📍 3. Street / Full Address
                          </label>
                          <select
                            value={columnMapping.address}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, address: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* City */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            🏙️ City
                          </label>
                          <select
                            value={columnMapping.city}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- Default (Karachi) --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* 4. Industry */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            🏭 4. Industry / Business Type
                          </label>
                          <select
                            value={columnMapping.industry || columnMapping.category}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, industry: e.target.value, category: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- Auto-Detect From Name --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* 5. Website */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            🌐 5. Website URL
                          </label>
                          <select
                            value={columnMapping.website}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, website: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* 6. Instagram */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            📱 6. Instagram Handle / URL
                          </label>
                          <select
                            value={columnMapping.instagram}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, instagram: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Facebook */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            📱 Facebook Page / URL
                          </label>
                          <select
                            value={columnMapping.facebook}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, facebook: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* 7. Rating */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            ⭐ 7. Rating Score (e.g. 4.8)
                          </label>
                          <select
                            value={columnMapping.rating}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, rating: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>

                        {/* Review Count */}
                        <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                          <label className="block text-[11px] font-bold text-slate-700">
                            💬 Total Review Count
                          </label>
                          <select
                            value={columnMapping.reviewCount}
                            onChange={(e) => setColumnMapping(prev => ({ ...prev, reviewCount: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs font-medium"
                          >
                            <option value="">-- None / Auto --</option>
                            {fileData.headers.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            /* STEP 3: SUCCESS CONFIRMATION */
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-1 max-w-md mx-auto">
                <h3 className="text-xl font-extrabold text-slate-900">
                  Data Successfully Organized & Saved!
                </h3>
                <p className="text-xs text-slate-600">
                  Successfully ingested <strong>{importedCount} records</strong> directly into Cloudflare R2{' '}
                  {importTarget === 'leads' ? 'Leads Pipeline' : 'Customers Pool'}.
                </p>
                <p className="text-[11px] text-emerald-700 font-semibold pt-1">
                  All 7 sections (Business Name, Contact, Address, Industry, Socials, Website, Reviews) + every single sheet column are ready!
                </p>
              </div>

              <div className="pt-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleFinish}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
                >
                  <span>Open {importTarget === 'leads' ? 'Leads Pipeline' : 'Customers View'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {!importSuccess && fileData && (
          <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={handleResetAndClose}
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={isProcessing || !organizedPreviewRecords.length}
              className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm shadow-blue-500/25 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isProcessing
                  ? 'Saving to Cloudflare R2...'
                  : `Confirm & Import ${organizedPreviewRecords.length} Leads`}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
