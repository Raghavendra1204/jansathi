import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Camera, MapPin, AlertCircle, Sparkles, 
  Trash2, UploadCloud, Eye, ArrowLeft, CheckCircle, Loader 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { analyzeReport } from '../services/gemini';
import { createReport, logUserActivity } from '../services/api';
import MapSelector from '../components/MapSelector';
import { useTranslation } from '../context/TranslationContext';
import SeverityBadge from '../components/SeverityBadge';
import { REGIONS_DATA, getRegionCoordinates, reverseGeocodeCoords } from '../utils/regions';

const CATEGORIES = ['Infrastructure', 'Roads & Safety', 'Sanitation', 'Public Space', 'Other'];

export default function ReportIssue() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const fileInputRef = useRef(null);
  const { t } = useTranslation();

  // Form States
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Infrastructure');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null); // stores blob URL
  const [imageFile, setImageFile] = useState(null);
  const [lat, setLat] = useState(12.9716);
  const [lng, setLng] = useState(77.5946);

  // Hierarchical Region Selection States
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedWard, setSelectedWard] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchingSuggestions, setSearchingSuggestions] = useState(false);
  const [selectedSuggestionName, setSelectedSuggestionName] = useState('');
  
  // Fetch Autocomplete Suggestions from OSM Nominatim API
  const fetchLocationSuggestions = async (text) => {
    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearchingSuggestions(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      setSuggestions(data || []);
    } catch (err) {
      console.error("Failed to fetch suggestions:", err);
    } finally {
      setSearchingSuggestions(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (location && location !== selectedSuggestionName) {
        fetchLocationSuggestions(location);
      } else if (!location) {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [location]);
  
  // AI/Gemini States
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [severity, setSeverity] = useState('Low');
  const [priorityScore, setPriorityScore] = useState(20);
  const [aiSummary, setAiSummary] = useState('');
  
  // Interaction States
  const [dragActive, setDragActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Trigger Gemini Analysis
  const handleAiAnalysis = async () => {
    if (!description.trim() || description.length < 10) return;
    
    setAiAnalyzing(true);
    try {
      const res = await analyzeReport(title || 'Untitled Issue', description);
      
      // Update form and preview states based on AI categorization
      if (res.category && CATEGORIES.includes(res.category)) {
        setCategory(res.category);
      }
      setSeverity(res.severity || 'Low');
      setPriorityScore(res.priorityScore || 20);
      setAiSummary(res.summary || '');
    } catch (error) {
      console.error("AI Analysis failed:", error);
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Handle Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleImageSelection(file);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      handleImageSelection(file);
    }
  };

  const handleImageSelection = (file) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.');
      return;
    }
    setImageFile(file);
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result); // Save persistent Base64 Data URL
    };
    reader.readAsDataURL(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current.click();
  };

  const removeImage = () => {
    setImage(null);
    setImageFile(null);
  };

  // Geolocation is managed natively by MapSelector component

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !location || !description) return;
    
    setSubmitting(true);
    try {
      let finalImageUrl = image;

      if (imageFile) {
        finalImageUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              const MAX_WIDTH = 800;
              const MAX_HEIGHT = 600;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                if (width > MAX_WIDTH) {
                  height *= MAX_WIDTH / width;
                  width = MAX_WIDTH;
                }
              } else {
                if (height > MAX_HEIGHT) {
                  width *= MAX_HEIGHT / height;
                  height = MAX_HEIGHT;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7)); // Compress to high-quality JPEG
            };
            img.onerror = () => resolve(null);
            img.src = reader.result;
          };
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(imageFile);
        });
      }

      // Geocode the location address on submit only if coordinates are still at default center
      let finalLat = lat;
      let finalLng = lng;
      if (lat === 12.9716 && lng === 77.5946) {
        if (selectedState && selectedCity) {
          const regionCoords = getRegionCoordinates(selectedState, selectedCity);
          finalLat = regionCoords[0];
          finalLng = regionCoords[1];
        }
        if (location) {
          try {
            const queryAddr = `${location}, ${selectedCity || ''}, ${selectedState || ''}`;
            const response = await fetch(
              `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(queryAddr)}&limit=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await response.json();
            if (data && data.length > 0) {
              finalLat = parseFloat(data[0].lat);
              finalLng = parseFloat(data[0].lon);
            }
          } catch (err) {
            console.error("Geocoding during submit failed:", err);
          }
        }
      }

      // Perform reverse geocoding to build the structured location object
      let structuredLoc = null;
      try {
        structuredLoc = await reverseGeocodeCoords(finalLat, finalLng);
      } catch (err) {
        console.error("Reverse geocoding failed during submission:", err);
      }

      if (!structuredLoc || !structuredLoc.state) {
        structuredLoc = {
          country: 'India',
          state: selectedState || '',
          district: selectedDistrict || '',
          city: selectedCity || '',
          taluka: selectedSector || '',
          village: '',
          ward: selectedWard || '',
          postalCode: '',
          latitude: finalLat,
          longitude: finalLng,
          displayName: location
        };
      } else {
        // Overlay explicit selection if Nominatim leaves fields blank
        if (selectedState && !structuredLoc.state) structuredLoc.state = selectedState;
        if (selectedDistrict && !structuredLoc.district) structuredLoc.district = selectedDistrict;
        if (selectedCity && !structuredLoc.city) structuredLoc.city = selectedCity;
        if (selectedSector && !structuredLoc.taluka) structuredLoc.taluka = selectedSector;
        if (selectedWard && !structuredLoc.ward) structuredLoc.ward = selectedWard;
        // Keep input text address as the displayName
        structuredLoc.displayName = location || structuredLoc.displayName || '';
      }

      const reporterName = user ? user.name : 'Anonymous Volunteer';
      const reporterAvatar = user ? user.avatar : null;
      await createReport(
        title,
        category,
        structuredLoc,
        description,
        finalImageUrl,
        reporterName,
        reporterAvatar,
        priorityScore,
        severity
      );
      if (user) {
        await logUserActivity(user.uid, `Reported Civic Issue: ${title}`, 50, 'Issue Submitted', `Submitted a new civic report titled "${title}"`, 'Completed');
      }
      setSubmitted(true);
    } catch (error) {
      console.error("Submission failed:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    navigate('/citizen-dashboard');
  };

  if (submitted) {
    return (
      <div className="min-h-[60vh] flex flex-col justify-center items-center py-8 px-4 text-center max-w-md mx-auto space-y-6 animate-fade-in">
        <div className="p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full animate-bounce">
          <CheckCircle className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold text-white tracking-tight">{t("Report Submitted!")}</h1>
          <p className="text-slate-400 text-sm">
            {t("Thank you! Your report has been analyzed by Gemini AI and queued for verification. A municipal officer will inspect the issue shortly.")}
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800 rounded-2xl text-left w-full text-xs text-slate-350 space-y-1">
          <span className="block font-bold text-white mb-1">{t("🎫 Report Receipt Details")}</span>
          <div><span className="font-bold text-slate-400">{t("Issue:")}</span> {t(title)}</div>
          <div><span className="font-bold text-slate-400">{t("Category:")}</span> {t(category)}</div>
          <div><span className="font-bold text-slate-400">{t("AI Priority Score:")}</span> {priorityScore}/100 ({t(severity)})</div>
          <div><span className="font-bold text-slate-400">{t("XP Reward:")}</span> +50 XP ({t("Pending resolution")})</div>
        </div>
        <button
          onClick={handleBackToDashboard}
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t("Back to Dashboard")}</span>
        </button>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto min-h-[70vh] flex flex-col justify-center items-center px-4 animate-fade-in">
        <div className="glass p-8 rounded-3xl border border-slate-800/60 shadow-2xl space-y-6 text-center select-none w-full relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Branding Logo */}
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600/10 rounded-2xl border border-blue-500/20 shadow-inner">
              <img src="/logo.png" alt="JanSathi Logo" className="w-16 h-16 object-contain rounded-xl" />
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-black text-white tracking-wider uppercase">
              JAN <span className="text-blue-500 font-medium">SATHI</span>
            </h1>
            <p className="text-slate-400 text-[10px] tracking-widest uppercase font-bold">
              जन सेवा, हमारा संकल्प
            </p>
          </div>

          <div className="border-t border-slate-800/40 my-2" />

          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white tracking-tight">{t("Login Required")}</h2>
            <p className="text-slate-400 text-xs leading-relaxed max-w-sm mx-auto">
              {t("Welcome to Jan Sathi! To report a new community issue, get AI priority scores, view nearby hazards, and earn citizen XP, please sign in or register an account.")}
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => navigate('/login')}
              className="w-full py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 transform hover:scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] cursor-pointer text-center"
            >
              {t("Sign In or Register")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
      
      {/* Header */}
      <div className="flex items-center gap-3 text-left">
        <button
          onClick={handleBackToDashboard}
          className="p-2 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          title={t("Back")}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>{t("Report a Civic Issue")}</span>
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            {t("Help improve your municipal community by reporting safety, sanitation, or infrastructure requests.")}
          </p>
        </div>
      </div>

      {/* Main Grid: Form Left, Preview Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Form Container */}
        <form onSubmit={handleSubmit} className="lg:col-span-7 glass p-6 sm:p-8 rounded-3xl border border-slate-800/60 shadow-xl space-y-5">
          
          {/* Issue Title */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="issue-title" className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
              {t("Short Title")}
            </label>
            <input
              id="issue-title"
              type="text"
              required
              placeholder={t("e.g. Broken Water Main on Elm St")}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          {/* Description (Triggers AI classification onBlur) */}
          <div className="space-y-1.5 text-left">
            <div className="flex justify-between items-center">
              <label htmlFor="issue-desc" className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                {t("Detailed Description")}
              </label>
              {description.trim().length >= 10 && (
                <button
                  type="button"
                  onClick={handleAiAnalysis}
                  disabled={aiAnalyzing}
                  className="text-[10px] font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {aiAnalyzing ? (
                    <>
                      <Loader className="w-3 h-3 animate-spin" />
                      <span>{t("AI Analyzing...")}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3 text-blue-400 animate-pulse" />
                      <span>{t("Gemini Auto-Sort")}</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <textarea
              id="issue-desc"
              required
              rows="4"
              placeholder={t("Provide details of the problem. (Tip: When you finish typing, Gemini will automatically classify and priority-sort the report!)")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleAiAnalysis}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors resize-none"
            />
          </div>

          {/* Category Selector */}
          <div className="space-y-1.5 text-left">
            <label htmlFor="issue-category" className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
              {t("Issue Category")}
            </label>
            <select
              id="issue-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors cursor-pointer"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{t(cat)}</option>
              ))}
            </select>
          </div>

          {/* Hierarchical Location Pickers */}
          <div className="space-y-4 p-4.5 rounded-2xl bg-slate-900/50 border border-slate-800/60">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5 text-left">
              <MapPin className="w-4 h-4 text-blue-400" />
              <span>{t("Select Location Region Jurisdiction")}</span>
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* State */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pl-1">{t("State")}</label>
                <select
                  required
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict('');
                    setSelectedCity('');
                    setSelectedSector('');
                    setSelectedWard('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold"
                >
                  <option value="">{t("Select State")}</option>
                  {Object.keys(REGIONS_DATA).map(st => (
                    <option key={st} value={st}>{t(st)}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pl-1">{t("District")}</label>
                <select
                  required
                  disabled={!selectedState}
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setSelectedCity('');
                    setSelectedSector('');
                    setSelectedWard('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("Select District")}</option>
                  {selectedState && Object.keys(REGIONS_DATA[selectedState]).map(dist => (
                    <option key={dist} value={dist}>{t(dist)}</option>
                  ))}
                </select>
              </div>

              {/* City */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pl-1">{t("City / Town")}</label>
                <select
                  required
                  disabled={!selectedDistrict}
                  value={selectedCity}
                  onChange={(e) => {
                    setSelectedCity(e.target.value);
                    setSelectedSector('');
                    setSelectedWard('');
                    
                    // Auto-pan coordinates when city is chosen
                    const coords = getRegionCoordinates(selectedState, e.target.value);
                    setLat(coords[0]);
                    setLng(coords[1]);
                  }}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("Select City")}</option>
                  {selectedState && selectedDistrict && Object.keys(REGIONS_DATA[selectedState][selectedDistrict]).map(ct => (
                    <option key={ct} value={ct}>{t(ct)}</option>
                  ))}
                </select>
              </div>

              {/* Sector */}
              <div className="space-y-1 text-left">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pl-1">{t("Sector / Zone")}</label>
                <select
                  required
                  disabled={!selectedCity}
                  value={selectedSector}
                  onChange={(e) => {
                    setSelectedSector(e.target.value);
                    setSelectedWard('');
                  }}
                  className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <option value="">{t("Select Sector / Zone")}</option>
                  {selectedState && selectedDistrict && selectedCity && Object.keys(REGIONS_DATA[selectedState][selectedDistrict][selectedCity]).map(sec => (
                    <option key={sec} value={sec}>{t(sec)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ward */}
            <div className="space-y-1 text-left">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide pl-1">{t("Ward No. / Name")}</label>
              <select
                required
                disabled={!selectedSector}
                value={selectedWard}
                onChange={(e) => setSelectedWard(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-850 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="">{t("Select Ward")}</option>
                {selectedState && selectedDistrict && selectedCity && selectedSector && REGIONS_DATA[selectedState][selectedDistrict][selectedCity][selectedSector].map(wd => (
                  <option key={wd} value={wd}>{t(wd)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Location Selector (Text Input + Interactive Map) */}
          <div className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label htmlFor="issue-location" className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
                {t("Location / Intersection")}
              </label>
              <input
                id="issue-location"
                type="text"
                required
                placeholder={t("e.g. Corner of Elm and 5th Ave")}
                value={location}
                onChange={(e) => {
                  setLocation(e.target.value);
                  if (e.target.value !== selectedSuggestionName) {
                    setSelectedSuggestionName('');
                  }
                }}
                className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
                autoComplete="off"
              />
              
              {/* Autocomplete Suggestions Dropdown Menu */}
              {suggestions.length > 0 && (
                <div className="absolute left-0 right-0 z-30 mt-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl max-h-48 overflow-y-auto">
                  {suggestions.map((sug, idx) => (
                    <div
                      key={idx}
                      onClick={() => {
                        const displayName = sug.display_name;
                        const latitude = parseFloat(sug.lat);
                        const longitude = parseFloat(sug.lon);
                        setLocation(displayName);
                        setSelectedSuggestionName(displayName);
                        setLat(latitude);
                        setLng(longitude);
                        setSuggestions([]);
                      }}
                      className="px-4 py-2.5 hover:bg-slate-800 text-xs text-slate-200 cursor-pointer border-b border-slate-800/40 last:border-0 leading-normal text-left transition-colors"
                    >
                      {sug.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <MapSelector 
              locationText={location}
              lat={lat}
              lng={lng}
              onLocationSelect={(address, latitude, longitude) => {
                setLocation(address);
                setSelectedSuggestionName(address);
                if (latitude && longitude) {
                  setLat(latitude);
                  setLng(longitude);
                }
              }} 
            />
          </div>

          {/* Image Upload Area */}
          <div className="space-y-2 text-left">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">
              {t("Upload Proof Image (Optional)")}
            </label>
            
            {image ? (
              <div className="relative rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/60 h-44 group">
                <img
                  src={image}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={removeImage}
                    className="p-2.5 bg-rose-600/90 text-white rounded-xl hover:bg-rose-500 transition-colors shadow-lg cursor-pointer"
                    title={t("Remove Image")}
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileSelect}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-500/5' 
                    : 'border-slate-800 bg-slate-900/20 hover:border-slate-700 hover:bg-slate-900/40'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/*"
                  className="hidden"
                />
                <UploadCloud className="w-10 h-10 text-slate-500" />
                <div>
                  <span className="block text-xs font-bold text-white">{t("Drag & drop your photo here")}</span>
                  <span className="block text-[10px] text-slate-500 mt-1">{t("or click to browse local files")}</span>
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-600/10 hover:shadow-blue-500/20 transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{submitting ? t('Submitting Report...') : t('Publish Civic Report')}</span>
          </button>

        </form>

        {/* Live Preview Container */}
        <div className="lg:col-span-5 space-y-4 lg:sticky lg:top-24 text-left">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-brand-400" />
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t("Live Report Preview")}</h2>
            </div>
            
            {/* AI analyzing indicator */}
            {aiAnalyzing && (
              <span className="text-[10px] text-blue-400 font-bold flex items-center gap-1 animate-pulse">
                <Loader className="w-3 h-3 animate-spin" />
                <span>{t("AI Categorizing...")}</span>
              </span>
            )}
          </div>

          {/* Preview Card */}
          <div className="group glass flex flex-col rounded-2xl overflow-hidden shadow-xl border border-slate-800/80 transition-all">
            
            {/* Image Box */}
            <div className="relative h-44 w-full overflow-hidden bg-slate-900/60 flex items-center justify-center">
              {image ? (
                <img
                  src={image}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-600 text-center gap-1.5 p-4">
                  <Camera className="w-8 h-8" />
                  <span className="text-[10px] font-bold uppercase tracking-wider">{t("No Photo Provided")}</span>
                </div>
              )}
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full glass border border-white/10 text-xs font-semibold text-white">
                {t(category)}
              </div>
              <div className="absolute top-4 right-4 px-2.5 py-1 rounded-lg bg-blue-600 text-xs font-bold text-white shadow-md">
                +50 XP
              </div>
            </div>

            {/* Content Details */}
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-brand-300 font-bold tracking-wider uppercase">
                    {t("Organized by Municipal Dispatch")}
                  </span>
                  
                  <SeverityBadge severity={severity} />
                </div>
                
                <h3 className="font-bold text-base text-white truncate">
                  {t(title) || t('Untargeted Civic Incident')}
                </h3>
                <p className="text-slate-400 text-xs line-clamp-3 leading-relaxed">
                  {t(description) || t('Provide details inside the description box on the left. Gemini will automatically extract the category, assess safety severity, and calculate priority scores.')}
                </p>
              </div>

              <div className="space-y-2 pt-3 border-t border-slate-800/60 text-[10px] text-slate-350 font-semibold font-semibold">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{t(location) || t('Pending Location details...')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">{t("Gemini Priority Score:")}</span>
                  <span className={`font-bold ${
                    priorityScore >= 80 ? 'text-rose-455' : 
                    priorityScore >= 60 ? 'text-amber-455' : 
                    'text-blue-455'
                  }`}>{priorityScore}/100</span>
                </div>
              </div>
            </div>

          </div>

          {/* AI Explanation Banner */}
          {aiSummary && (
            <div className="p-4 rounded-2xl bg-blue-955/20 border border-blue-500/10 text-[10px] text-slate-400 leading-relaxed animate-fade-in">
              <span className="font-bold text-blue-400 block mb-0.5">{t("🧠 Gemini AI Assessment Summary")}</span>
              {t(aiSummary)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
