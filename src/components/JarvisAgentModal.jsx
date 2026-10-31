import React, { useState, useEffect, useRef } from 'react';
import { useCrm } from '../context/CrmContext';
import { BUSINESS_CATEGORIES } from '../utils/categoryUtils';
import { TikTokIcon, InstagramIcon, LinkedInIcon, YouTubeIcon, formatSocialUrl } from '../utils/socialUtils';
import { 
  X, 
  Bot, 
  Sparkles, 
  Mic, 
  MicOff, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Globe, 
  UserCheck, 
  RefreshCw,
  Wand2,
  Cpu,
  Zap,
  Flame,
  Volume2
} from 'lucide-react';

const CITIES_LIST = [
  'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 
  'Multan', 'Peshawar', 'Sialkot', 'Gujranwala', 'Hyderabad', 
  'Quetta', 'Abbottabad', 'Bahawalpur', 'Sargodha'
];

export const parseJarvisPrompt = (rawText, currentUser) => {
  if (!rawText || !rawText.trim()) return null;
  const text = rawText.trim();

  // 1. Extract Phone Number (Pakistani formats: 03001234567, 0300-1234567, +923001234567, 923001234567, 0300 1234567)
  let phone = '';
  const phoneRegex = /(?:\+?92|0)?\s?3[0-9]{2}[-.\s]?[0-9]{7}/;
  const phoneMatch = text.match(phoneRegex);
  if (phoneMatch) {
    phone = phoneMatch[0].replace(/[-.\s]/g, '');
  }

  // 2. Extract Email
  let email = '';
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const emailMatch = text.match(emailRegex);
  if (emailMatch) {
    email = emailMatch[0];
  }

  // 3. Extract Website
  let website = '';
  const webRegex = /(?:https?:\/\/|www\.)[^\s,]+|(?:[a-zA-Z0-9-]+\.)+(?:com|pk|com\.pk|org|net|io|store|tech|co)\b/i;
  const webMatch = text.match(webRegex);
  if (webMatch && !webMatch[0].includes('@')) {
    website = webMatch[0];
  }

  // 4. Extract Instagram
  let instagram = '';
  const instaRegex = /(?:instagram\.com\/|insta(?::|\s+)?@?|ig(?::|\s+)?@?|@)([a-zA-Z0-9._]{3,30})/i;
  const instaMatch = text.match(instaRegex);
  if (instaMatch) {
    instagram = instaMatch[1];
  }

  // 5. Extract TikTok
  let tiktok = '';
  const tiktokRegex = /(?:tiktok\.com\/@?|tiktok(?::|\s+)?@?)([a-zA-Z0-9._]{3,30})/i;
  const tiktokMatch = text.match(tiktokRegex);
  if (tiktokMatch) {
    tiktok = tiktokMatch[1];
  }

  // 6. Extract Facebook
  let facebook = '';
  const fbRegex = /(?:facebook\.com\/(?:p\/)?|fb(?::|\s+)?@?)([a-zA-Z0-9._-]{3,50})/i;
  const fbMatch = text.match(fbRegex);
  if (fbMatch) {
    facebook = fbMatch[1];
  }

  // 7. Extract LinkedIn
  let linkedin = '';
  const linkedinRegex = /(?:linkedin\.com\/(?:in|company)\/|linkedin(?::|\s+)?)([a-zA-Z0-9-_]{3,40})/i;
  const linkedinMatch = text.match(linkedinRegex);
  if (linkedinMatch) {
    linkedin = linkedinMatch[1];
  }

  // 8. Extract YouTube
  let youtube = '';
  const ytRegex = /(?:youtube\.com\/(?:@|c\/|user\/)?|yt(?::|\s+)?@?)([a-zA-Z0-9._-]{3,40})/i;
  const ytMatch = text.match(ytRegex);
  if (ytMatch) {
    youtube = ytMatch[1];
  }

  // 9. Extract Twitter / X
  let twitter = '';
  const twitterRegex = /(?:twitter\.com\/|x\.com\/|twitter(?::|\s+)?@?)([a-zA-Z0-9._-]{3,40})/i;
  const twitterMatch = text.match(twitterRegex);
  if (twitterMatch) {
    twitter = twitterMatch[1];
  }

  // 10. Extract Address
  let address = '';
  const addressRegex = /(?:address(?::|\s+)?|located at\s+)?([0-9A-Za-z\s,-]+(?:street|road|rd|st|phase|dha|block|plot|suite|sector|floor|chowk|bazaar|market|town)[0-9A-Za-z\s,-]*)/i;
  const addressMatch = text.match(addressRegex);
  if (addressMatch) {
    address = addressMatch[1].trim().replace(/^,\s*|,\s*$/g, '');
  }

  // 11. Extract City
  let city = 'Karachi';
  for (const c of CITIES_LIST) {
    const cityRegex = new RegExp(`\\b${c}\\b`, 'i');
    if (cityRegex.test(text)) {
      city = c;
      break;
    }
  }

  // 9. Extract Status
  let status = 'Pending';
  const lower = text.toLowerCase();
  if (lower.includes('interested') || lower.includes('hot') || lower.includes('deal pakki') || lower.includes('tayyar hai')) {
    status = 'Interested';
  } else if (lower.includes('connected') || lower.includes('baat hui') || lower.includes('call pick')) {
    status = 'Connected';
  } else if (lower.includes('not connected') || lower.includes('missed') || lower.includes('nahi uthai') || lower.includes('busy')) {
    status = 'Not Connected';
  } else if (lower.includes('not on whatsapp') || lower.includes('no whatsapp') || lower.includes('wa nahi')) {
    status = 'Not on WhatsApp';
  } else if (lower.includes('not interested') || lower.includes('mana kar diya') || lower.includes('closed') || lower.includes('no interest')) {
    status = 'Not Interested';
  }

  // 10. Extract Business Category
  let category = 'General Business';
  if (/dent|clinic|doctor|hospital|pharma|medical|dr\b|medic/i.test(text)) {
    category = 'Clinics & Healthcare';
  } else if (/school|college|academy|institute|university|tutor|educat/i.test(text)) {
    category = 'Schools & Education';
  } else if (/salon|beauty|parlor|parlour|spa|makeup|hair/i.test(text)) {
    category = 'Beauty & Salons';
  } else if (/restaurant|cafe|food|pizza|burger|bakery|catering|sweets/i.test(text)) {
    category = 'Restaurants & Food';
  } else if (/real estate|property|builder|developer|scheme|plots/i.test(text)) {
    category = 'Real Estate & Builders';
  } else if (/fashion|cloth|apparel|boutique|garment|shoes|tailor/i.test(text)) {
    category = 'Fashion & Retail';
  } else if (/software|it agency|digital|marketing|graphic|agency|tech/i.test(text)) {
    category = 'Tech & Digital Services';
  } else if (/gym|fitness|workout|trainer/i.test(text)) {
    category = 'Fitness & Gyms';
  }

  // 11. Extract Lead / Company Name
  // Heuristic: Remove the phone, email, urls, and common filler words
  let cleanForName = text;
  if (phone) cleanForName = cleanForName.replace(phoneRegex, ' ');
  if (email) cleanForName = cleanForName.replace(emailRegex, ' ');
  if (website) cleanForName = cleanForName.replace(webRegex, ' ');
  if (instaMatch) cleanForName = cleanForName.replace(instaMatch[0], ' ');
  if (tiktokMatch) cleanForName = cleanForName.replace(tiktokMatch[0], ' ');
  if (linkedinMatch) cleanForName = cleanForName.replace(linkedinMatch[0], ' ');
  if (ytMatch) cleanForName = cleanForName.replace(ytMatch[0], ' ');

  // Strip stop/filler phrases
  const stopWords = [
    /\b(lead|bhai|ek|mera|meri|client|customer|ka|ki|ke|ko|se|hai|hain|tha|thi|the|bhi|aur|and|with|number|phone|call|karni|karna|interested|status|notes|details|address|city|insta|instagram|tiktok|web|website|yt|youtube)\b/gi,
    new RegExp(`\\b${city}\\b`, 'gi'),
    /[,.:;!?]/g
  ];

  let nameCandidates = cleanForName;
  stopWords.forEach(sw => {
    nameCandidates = nameCandidates.replace(sw, ' ');
  });

  const words = nameCandidates.trim().split(/\s+/).filter(w => w.length > 1);
  let name = words.slice(0, 3).join(' ');

  // Capitalize name
  name = name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') || 'Prospective Client';

  return {
    name,
    phone: phone || '0300-0000000',
    email,
    address,
    category,
    city,
    status,
    website,
    instagram,
    facebook,
    tiktok,
    linkedin,
    youtube,
    twitter,
    notes: text,
    assignedAgent: currentUser?.type === 'agent' ? currentUser?.name : 'Fareed',
    source: 'Jarvis AI Agent'
  };
};

export const JarvisAgentModal = ({ isOpen, onClose }) => {
  const { auth, agents, addLead } = useCrm();
  const [prompt, setPrompt] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedLead, setExtractedLead] = useState(null);
  const [jarvisReply, setJarvisReply] = useState('Greetings. I am JARVIS, your AI Lead Automation Assistant. Give me any lead details in plain Urdu or English, and I will extract the attributes and build the lead for you.');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const recognitionRef = useRef(null);
  const inputRef = useRef(null);

  // Initialize Web Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US'; // handles Urdu names and English terms smoothly

      recognition.onstart = () => {
        setIsListening(true);
        setJarvisReply('JARVIS is listening... Speak your lead details clearly.');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setPrompt(prev => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
        handleAnalyze(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
        setJarvisReply('Audio signal lost or permission denied. Please type your lead details below.');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setSaveSuccess(false);
      setIsSaving(false);
      setIsProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  const toggleMic = () => {
    if (!speechSupported) {
      alert('Speech recognition is not supported in this browser. Please type in the text box.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleAnalyze = (textToAnalyze = prompt) => {
    if (!textToAnalyze || !textToAnalyze.trim()) return;

    setIsProcessing(true);
    setSaveSuccess(false);

    setTimeout(() => {
      const parsed = parseJarvisPrompt(textToAnalyze, auth);
      setExtractedLead(parsed);
      setIsProcessing(false);

      if (parsed) {
        setJarvisReply(
          `Analysis complete, sir. Extracted "${parsed.name}" (${parsed.phone}) classified under "${parsed.category}" located in ${parsed.city}. Pipeline status set to ${parsed.status}. Review the hologram card below and deploy to Cloudflare R2.`
        );
      }
    }, 600);
  };

  const handleFieldChange = (field, value) => {
    setExtractedLead(prev => ({ ...prev, [field]: value }));
  };

  const handleConfirmCreate = async () => {
    if (!extractedLead) return;
    setIsSaving(true);

    try {
      const result = await addLead(extractedLead);
      if (result) {
        setIsSaving(false);
        setSaveSuccess(true);
        setJarvisReply(
          `⚡ Lead "${extractedLead.name}" has been permanently registered in Cloudflare R2 and assigned to ${extractedLead.assignedAgent}. Anything else, sir?`
        );
        setTimeout(() => {
          onClose();
          setExtractedLead(null);
          setPrompt('');
          setSaveSuccess(false);
        }, 1800);
      }
    } catch (err) {
      setIsSaving(false);
      setJarvisReply(`Error deploying lead: ${err.message}`);
    }
  };

  const handleQuickPreset = (sample) => {
    setPrompt(sample);
    handleAnalyze(sample);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-cyan-500/30 rounded-3xl shadow-2xl shadow-cyan-500/10 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden text-slate-100 ring-1 ring-cyan-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Futuristic Jarvis Header */}
        <div className="px-5 py-4 border-b border-cyan-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-cyan-950/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Pulsing Arc Reactor Icon */}
            <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 shadow-inner shadow-cyan-400/30">
              <div className="absolute inset-1 rounded-xl bg-cyan-500/10 animate-ping opacity-30" />
              <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold tracking-wider text-cyan-300 font-mono flex items-center gap-1.5">
                  <span>JARVIS AI LEAD AGENT</span>
                </h3>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  ONLINE
                </span>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Autonomous Natural Language Lead Extractor • Powered by Cloudflare R2
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Close Jarvis"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Jarvis Dialogue Screen */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 font-sans">
          {/* AI Voice Bubble */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-cyan-500/30 flex items-start gap-3 shadow-inner">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-bold text-cyan-400 uppercase tracking-wider text-[11px]">
                  JARVIS System Response
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
              </div>
              <p className="text-slate-300 leading-relaxed font-medium">
                {jarvisReply}
              </p>
            </div>
          </div>

          {/* Prompt Input Box & Mic */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-slate-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-cyan-400">
                <Wand2 className="w-3.5 h-3.5" />
                <span>Provide Lead Data (Voice or Text in Urdu / English):</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">
                Paste WhatsApp message, audio dictate, or rough details
              </span>
            </label>

            <div className="relative">
              <textarea
                ref={inputRef}
                rows={3}
                placeholder="Example: Bhai ek lead aayi hai Dr. Farhan Dental Care Gulshan Karachi phone 03001234567 insta @farhandental tiktok @drfarhandental website farhandental.pk interested hai kal 3 baje call karni hai"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAnalyze();
                  }
                }}
                className="w-full p-3.5 pr-24 bg-slate-950 border border-cyan-500/30 rounded-2xl text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-400 transition-all resize-none font-sans"
              />

              {/* Action Buttons inside Textarea */}
              <div className="absolute right-2.5 bottom-3 flex items-center gap-1.5">
                {speechSupported && (
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isListening 
                        ? 'bg-rose-600 text-white animate-pulse shadow-md shadow-rose-500/40' 
                        : 'bg-slate-800 text-slate-300 hover:text-cyan-400 hover:bg-slate-700'
                    }`}
                    title={isListening ? 'Stop Listening' : 'Speak to Jarvis (Dictate)'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleAnalyze()}
                  disabled={!prompt.trim() || isProcessing}
                  className="px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/25 disabled:opacity-40 cursor-pointer active:scale-95"
                  title="Extract Lead Attributes"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  ) : (
                    <>
                      <span>Extract</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Quick Test Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[11px] text-slate-400 font-mono">Quick Test:</span>
              <button
                type="button"
                onClick={() => handleQuickPreset('Dr. Bilal Dental Clinic Gulshan Karachi phone 03001234567 insta @bilaldental tiktok @drbilaldental web bilaldental.pk interested')}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer font-mono"
              >
                + Dr. Bilal Dental (Karachi)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('Delizia Bakery clifton karachi 03219876543 contact@delizia.pk insta @delizia_pk connected')}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer font-mono"
              >
                + Delizia Bakery (Food)
              </button>
              <button
                type="button"
                onClick={() => handleQuickPreset('Beaconhouse Academy Blue Area Islamabad 03335551234 beaconhouse.edu.pk hot lead')}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950 text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer font-mono"
              >
                + Beaconhouse (Islamabad)
              </button>
            </div>
          </div>

          {/* Holographic Extracted Lead Card Preview */}
          {extractedLead && (
            <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 to-slate-900 border border-cyan-500/40 shadow-xl space-y-4 animate-in slide-in-from-bottom-2">
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  <span className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
                    Holographic Lead Blueprint
                  </span>
                </div>
                <span className="text-[11px] font-mono text-slate-400">
                  Ready to deploy
                </span>
              </div>

              {/* Editable Fields Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Lead Name */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-cyan-400" />
                    <span>Lead Name</span>
                  </label>
                  <input
                    type="text"
                    value={extractedLead.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-slate-100 font-bold"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <Phone className="w-3 h-3 text-emerald-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="text"
                    value={extractedLead.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-slate-100 font-mono font-bold"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <Briefcase className="w-3 h-3 text-amber-400" />
                    <span>Category</span>
                  </label>
                  <select
                    value={extractedLead.category}
                    onChange={(e) => handleFieldChange('category', e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-slate-100 cursor-pointer"
                  >
                    {BUSINESS_CATEGORIES.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                    <option value="General Business">General Business</option>
                  </select>
                </div>

                {/* City */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-rose-400" />
                    <span>City</span>
                  </label>
                  <select
                    value={extractedLead.city}
                    onChange={(e) => handleFieldChange('city', e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-slate-100 cursor-pointer"
                  >
                    {CITIES_LIST.map(city => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    <span>Pipeline Status</span>
                  </label>
                  <select
                    value={extractedLead.status}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-slate-100 font-semibold cursor-pointer"
                  >
                    <option value="Pending">Pending</option>
                    <option value="Connected">Connected</option>
                    <option value="Not Connected">Not Connected</option>
                    <option value="Interested">Interested (Hot)</option>
                    <option value="Not Interested">Not Interested</option>
                    <option value="Not on WhatsApp">Not on WhatsApp</option>
                  </select>
                </div>

                {/* Assigned Agent */}
                <div>
                  <label className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                    <UserCheck className="w-3 h-3 text-blue-400" />
                    <span>Assigned Agent</span>
                  </label>
                  {auth?.type === 'agent' ? (
                    <div className="px-2.5 py-1.5 bg-slate-800/80 rounded-lg font-bold text-cyan-300">
                      {auth?.name} (You)
                    </div>
                  ) : (
                    <select
                      value={extractedLead.assignedAgent}
                      onChange={(e) => handleFieldChange('assignedAgent', e.target.value)}
                      className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg text-slate-100 cursor-pointer"
                    >
                      <option value="Admin">Admin</option>
                      {agents.map(a => (
                        <option key={a.id || a.name} value={a.name}>{a.name}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Social Links Row */}
                <div className="sm:col-span-2 pt-1 border-t border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block mb-1.5">
                    Extracted Social Presence:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {/* Instagram */}
                    <div className="relative">
                      <InstagramIcon className="w-3 h-3 text-pink-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="Instagram"
                        value={extractedLead.instagram}
                        onChange={(e) => handleFieldChange('instagram', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 font-mono"
                      />
                    </div>

                    {/* TikTok */}
                    <div className="relative">
                      <TikTokIcon className="w-3 h-3 text-slate-300 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="TikTok"
                        value={extractedLead.tiktok}
                        onChange={(e) => handleFieldChange('tiktok', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 font-mono"
                      />
                    </div>

                    {/* Website */}
                    <div className="relative">
                      <Globe className="w-3 h-3 text-blue-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="Website"
                        value={extractedLead.website}
                        onChange={(e) => handleFieldChange('website', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200"
                      />
                    </div>

                    {/* LinkedIn */}
                    <div className="relative">
                      <LinkedInIcon className="w-3 h-3 text-sky-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="LinkedIn"
                        value={extractedLead.linkedin}
                        onChange={(e) => handleFieldChange('linkedin', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 font-mono"
                      />
                    </div>

                    {/* YouTube */}
                    <div className="relative">
                      <YouTubeIcon className="w-3 h-3 text-rose-400 absolute left-2 top-2" />
                      <input
                        type="text"
                        placeholder="YouTube"
                        value={extractedLead.youtube}
                        onChange={(e) => handleFieldChange('youtube', e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Confirm / Save Button */}
              <div className="pt-2 flex items-center justify-between border-t border-cyan-500/20">
                <span className="text-[11px] text-cyan-400 font-mono flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Target: Cloudflare R2 Database</span>
                </span>

                <button
                  type="button"
                  onClick={handleConfirmCreate}
                  disabled={isSaving || saveSuccess}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/25 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Deploying to R2...</span>
                    </>
                  ) : saveSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>Lead Successfully Created!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-slate-950" />
                      <span>Confirm & Create Lead</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Jarvis Footer Status */}
        <div className="px-5 py-3 bg-slate-950 border-t border-cyan-500/20 flex items-center justify-between text-[11px] font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>AI CORE STATUS: READY</span>
          </div>

          <span className="text-slate-500">
            Press Ctrl + Enter to analyze
          </span>
        </div>
      </div>
    </div>
  );
};
