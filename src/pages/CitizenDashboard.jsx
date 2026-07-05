import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  FileText, Clock, CheckCircle, Award, 
  MapPin, AlertTriangle, AlertCircle, PlusCircle, 
  Settings, Compass, Home as HomeIcon, MessageSquare, X,
  ChevronDown, ChevronUp, Sparkles, Cpu, Share2, Edit3, Trash2,
  Users, Wrench
} from 'lucide-react';
import { formatDate } from '../utils/helpers';
import { useTranslation } from '../context/TranslationContext';
import { fetchReports, createReport, updateReport, deleteReport } from '../services/api';
import { REGIONS_DATA, getReportRegion, getRegionCoordinates } from '../utils/regions';

const MOCK_REPORTS = [
  {
    id: 'rep-01',
    title: 'Broken Streetlight',
    category: 'Infrastructure',
    location: '405 Pine Street, Downtown',
    date: '2026-06-25',
    status: 'Resolved',
    description: 'Streetlight pole #12 is completely dark, causing safety concerns for pedestrians at night.',
    pointsEarned: 50,
    statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    resolvedDate: '2026-06-26',
    resolvedBy: 'Officer Sandeep Kumar',
    resolutionTime: '18 Hours',
    resolutionCost: '₹2,400',
    severity: 'Medium',
    priorityScore: 35,
    officerNote: 'Bulb replaced. Main electrical grid connector checked and verified functional.',
    laborUsed: '2 Electrician Engineers, 1 Utility Lift Vehicle',
    imageUrl: 'https://images.unsplash.com/photo-1485088478149-6e44b2fa7f4f?auto=format&fit=crop&q=80&w=800',
    lat: 12.9784,
    lng: 77.5906
  },
  {
    id: 'rep-02',
    title: 'Pothole in Right Lane',
    category: 'Roads & Safety',
    location: '1200 Broadway Ave',
    date: '2026-06-22',
    status: 'Pending',
    description: 'Large, deep pothole in the right lane of Broadway causing cars to swerve abruptly.',
    pointsEarned: 0,
    statusColor: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    assignedOfficer: 'Officer Ramesh Prasad',
    estimatedTime: '48 Hours',
    estimatedCost: '₹15,000',
    severity: 'Critical',
    priorityScore: 82,
    officerNote: 'Inspected pothole size. Confirmed traffic hazard risk. Dispatched road crew to lay temporary asphalt repair.',
    imageUrl: 'https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=800',
    lat: 12.9698,
    lng: 77.6052
  },
  {
    id: 'rep-03',
    title: 'Overflowing Dumpster',
    category: 'Sanitation',
    location: 'Oak Park Recreation Field',
    date: '2026-06-18',
    status: 'Resolved',
    description: 'Trash has accumulated around the dumpster, attracting animals and creating odor issues.',
    pointsEarned: 50,
    statusColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    resolvedDate: '2026-06-20',
    resolvedBy: 'Officer Ananya Sen',
    resolutionTime: '24 Hours',
    resolutionCost: '₹1,200',
    severity: 'Low',
    priorityScore: 20,
    officerNote: 'Dispatched sanitation waste collector. Cleared surrounding trash piles. Dumpster cleaned and sanitized.',
    laborUsed: '3 Sanitation Workers, 1 Waste Compactor Truck',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=800',
    lat: 12.9562,
    lng: 77.5750
  },
  {
    id: 'rep-04',
    title: 'Damaged Guardrail',
    category: 'Roads & Safety',
    location: 'Highway 10 Exit 4 Ramp',
    date: '2026-06-12',
    status: 'Submitted',
    description: 'A portion of the metal guardrail is bent outwards, exposing a sharp edge.',
    pointsEarned: 0,
    statusColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    assignedOfficer: 'Officer Vikram Rathore',
    estimatedTime: '72 Hours',
    estimatedCost: '₹45,000',
    severity: 'High',
    priorityScore: 65,
    officerNote: 'Initial assessment completed. Guardrail damage verified. Awaiting work-crew schedule slots.',
    imageUrl: 'https://images.unsplash.com/photo-1584467541268-b040f83be3fd?auto=format&fit=crop&q=80&w=800',
    lat: 12.9850,
    lng: 77.6210
  }
];

export default function CitizenDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState(MOCK_REPORTS);
  const [expandedReportId, setExpandedReportId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'Submitted', 'Pending', 'Resolved'
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'report', 'messages', 'settings'
  const [viewMode, setViewMode] = useState('feed'); // 'feed' or 'map'
  const [selectedMapReport, setSelectedMapReport] = useState(null);
  const { t } = useTranslation();
  
  // Hierarchical Region Filtering States
  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedSector, setSelectedSector] = useState('');
  const [selectedWard, setSelectedWard] = useState('');

  const uniqueStates = useMemo(() => {
    const states = new Set();
    reports.forEach(r => {
      const region = getReportRegion(r);
      if (region.state) states.add(region.state);
    });
    return Array.from(states).sort();
  }, [reports]);

  const uniqueDistricts = useMemo(() => {
    const districts = new Set();
    reports.forEach(r => {
      const region = getReportRegion(r);
      if (region.state === selectedState && region.district) {
        districts.add(region.district);
      }
    });
    return Array.from(districts).sort();
  }, [reports, selectedState]);

  const uniqueCities = useMemo(() => {
    const cities = new Set();
    reports.forEach(r => {
      const region = getReportRegion(r);
      if (region.state === selectedState && region.district === selectedDistrict && region.city) {
        cities.add(region.city);
      }
    });
    return Array.from(cities).sort();
  }, [reports, selectedState, selectedDistrict]);

  const uniqueSectors = useMemo(() => {
    const sectors = new Set();
    reports.forEach(r => {
      const region = getReportRegion(r);
      if (region.state === selectedState && region.district === selectedDistrict && region.city === selectedCity && region.sector) {
        sectors.add(region.sector);
      }
    });
    return Array.from(sectors).sort();
  }, [reports, selectedState, selectedDistrict, selectedCity]);

  const uniqueWards = useMemo(() => {
    const wards = new Set();
    reports.forEach(r => {
      const region = getReportRegion(r);
      if (region.state === selectedState && region.district === selectedDistrict && region.city === selectedCity && region.sector === selectedSector && region.ward) {
        wards.add(region.ward);
      }
    });
    return Array.from(wards).sort();
  }, [reports, selectedState, selectedDistrict, selectedCity, selectedSector]);

  const matchesStatusFilter = (r) => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Pending') {
      return r.status === 'Pending' || r.status === 'Resources Assigned' || r.status === 'Assigned' || r.status === 'In Progress';
    }
    return r.status === statusFilter;
  };

  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
  });

  useEffect(() => {
    const handleThemeChange = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };
    window.addEventListener('mock-auth-state-change', handleThemeChange);
    return () => {
      window.removeEventListener('mock-auth-state-change', handleThemeChange);
    };
  }, []);

  // Submit report modal simulation
  const [isReporting, setIsReporting] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Infrastructure');
  const [newLocation, setNewLocation] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const mapInstance = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    async function loadReports() {
      try {
        const data = await fetchReports();
        
        let updated = false;
        const migratedData = await Promise.all(data.map(async (r) => {
          const isDefaultCoords = (Math.abs(r.lat - 12.9716) < 0.0001 && Math.abs(r.lng - 77.5946) < 0.0001) || !r.lat;
          const locText = r.location && typeof r.location === 'object' ? r.location.address : r.location;
          const isCustomLocation = locText && !locText.includes('Bengaluru') && !locText.includes('Pine Street') && !locText.includes('Broadway') && !locText.includes('Oak Park');
          
          if (isDefaultCoords && isCustomLocation) {
            try {
              const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locText)}&limit=1`);
              const geocode = await res.json();
              if (geocode && geocode.length > 0) {
                r.lat = parseFloat(geocode[0].lat);
                r.lng = parseFloat(geocode[0].lon);
                updated = true;
              }
            } catch (err) {
              console.error("Migration geocode failed for location:", locText, err);
            }
          }
          return r;
        }));

        if (updated) {
          localStorage.setItem('jan_sathi_reports', JSON.stringify(migratedData));
        }
        // Assign dynamic statusColor based on current status
        const enrichedReports = migratedData.map(r => ({
          ...r,
          statusColor: r.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            : r.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
            : r.status === 'Resources Assigned' || r.status === 'Assigned' || r.status === 'In Progress' ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
            : r.statusColor || 'bg-blue-500/10 text-blue-400 border-blue-500/30'
        }));
        setReports(enrichedReports);
      } catch (err) {
        console.error("Failed to load reports:", err);
      }
    }
    loadReports();
  }, []);

  const handleCreateReport = async (e) => {
    e.preventDefault();
    if (!newTitle || !newLocation || !newDesc) return;
    
    try {
      const reporterName = user ? user.name : 'Anonymous Volunteer';
      const reporterAvatar = user ? user.avatar : null;
      
      const newReport = await createReport(
        newTitle,
        newCategory,
        newLocation,
        newDesc,
        null, // imageUrl
        reporterName,
        reporterAvatar,
        40, // priorityScore
        'Medium', // severity
        12.9716 + (Math.random() - 0.5) * 0.15,
        77.5946 + (Math.random() - 0.5) * 0.15
      );

      // Add dynamic statusColor
      const enrichedReport = {
        ...newReport,
        statusColor: 'bg-blue-500/10 text-blue-400 border-blue-500/30'
      };

      setReports([enrichedReport, ...reports]);
      setNewTitle('');
      setNewLocation('');
      setNewDesc('');
      setIsReporting(false);
    } catch (err) {
      console.error("Failed to create report:", err);
    }
  };

  const handleDeleteReport = async (reportId) => {
    if (!window.confirm(t('Are you sure you want to delete this civic report? This action cannot be undone.'))) return;
    try {
      await deleteReport(reportId);
      setReports(prev => prev.filter(r => r.id !== reportId));
      setSuccessMsg(t('Report deleted successfully!'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error(err);
      setErrorMsg(t('Failed to delete report.'));
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  useEffect(() => {
    if (viewMode !== 'map') return;

    // Dynamically load Leaflet CSS if not already present
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      link.id = 'leaflet-css';
      document.head.appendChild(link);
    }

    // Dynamically load Leaflet JS if not already present
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.id = 'leaflet-js';
      script.onload = () => {
        initLeafletMap();
      };
      document.head.appendChild(script);
    } else {
      if (window.L) {
        initLeafletMap();
      }
    }

      function initLeafletMap() {
        const L = window.L;
        if (!L) return;

        let map = mapInstance.current;

        if (!map) {
          let center = [20.5937, 78.9629]; // Geographic center of India
          let initialZoom = 5;

          if (selectedState && selectedCity) {
            center = getRegionCoordinates(selectedState, selectedCity);
            initialZoom = 12;
          }

          const isDark = document.documentElement.classList.contains('dark');
          const tileUrl = isDark 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' 
            : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

          map = L.map('leaflet-map-container', {
            zoomControl: false
          }).setView(center, initialZoom);

          L.tileLayer(tileUrl, {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            maxZoom: 20
          }).addTo(map);

          L.control.zoom({ position: 'topright' }).addTo(map);
          mapInstance.current = map;
        } else {
          // Dynamically adjust map focus based on filters
          if (selectedState && selectedCity) {
            const coords = getRegionCoordinates(selectedState, selectedCity);
            map.setView(coords, 12, { animate: true });
          } else if (!selectedState) {
            map.setView([20.5937, 78.9629], 5, { animate: true });
          }
        }

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const markerLatLngs = [];

        // Render markers from processedReports (hierarchical location filter applied)
        processedReports.forEach((report) => {
          if (!report.lat || !report.lng) return;

          markerLatLngs.push([report.lat, report.lng]);

          const color = report.severity === 'Critical' ? '#f43f5e' :
                        report.severity === 'High' ? '#f59e0b' :
                        report.severity === 'Medium' ? '#3b82f6' :
                        '#64748b';

          const markerHtml = `
            <div style="position: relative; width: 24px; height: 24px; pointer-events: auto;">
              <span class="animate-ping" style="position: absolute; top: 0; left: 0; display: inline-flex; width: 100%; height: 100%; border-radius: 50%; background-color: ${color}; opacity: 0.45; animation-duration: 1.5s;"></span>
              <span style="position: relative; display: block; width: 12px; height: 12px; margin: 6px; border-radius: 50%; background-color: ${color}; border: 2px solid #ffffff; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.15);"></span>
            </div>
          `;

          const customIcon = L.divIcon({
            html: markerHtml,
            className: 'custom-map-marker',
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          });

          const marker = L.marker([report.lat, report.lng], { icon: customIcon }).addTo(map);
          marker.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            setSelectedMapReport(report);
          });

          // Hover interactions
          marker.on('mouseover', () => {
            setSelectedMapReport(report);
          });

          // Bind interactive tooltip on hover
          marker.bindTooltip(`
            <div style="
              padding: 6px 10px; 
              font-family: 'Plus Jakarta Sans', system-ui, sans-serif; 
              font-size: 11px; 
              border-radius: 8px; 
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
              border: 1px solid ${theme === 'light' ? '#e2e8f0' : '#1e293b'};
              background-color: ${theme === 'light' ? '#ffffff' : '#0f172a'};
              color: ${theme === 'light' ? '#0f172a' : '#ffffff'};
            ">
              <span style="color: ${color}; text-transform: uppercase; font-size: 8px; font-weight: 900; letter-spacing: 0.05em; display: block;">${t(report.category)}</span>
              <strong style="display: block; margin-top: 2px; font-weight: 700; color: ${theme === 'light' ? '#0f172a' : '#ffffff'};">${t(report.title)}</strong>
              <span style="display: block; font-size: 9px; color: ${theme === 'light' ? '#475569' : '#94a3b8'}; margin-top: 1px;">${t("Severity")}: ${t(report.severity || 'Medium')}</span>
            </div>
          `, {
            direction: 'top',
            offset: [0, -10],
            opacity: 0.95,
            className: 'custom-map-tooltip'
          });

          markersRef.current.push(marker);
        });

      // Fit map bounds to show all markers dynamically
      if (markerLatLngs.length > 0) {
        map.fitBounds(markerLatLngs, { padding: [50, 50], maxZoom: 15 });
      }
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [viewMode, statusFilter, reports, theme, selectedState, selectedDistrict, selectedCity, selectedSector, selectedWard]);

  // Filtered reports based on status AND place hierarchy
  const processedReports = useMemo(() => {
    return reports.filter(r => {
      // 1. Status Filter
      if (!matchesStatusFilter(r)) return false;
      
      // 2. Hierarchical Region Filter
      const region = getReportRegion(r);
      if (selectedState && region.state !== selectedState) return false;
      if (selectedDistrict && region.district !== selectedDistrict) return false;
      if (selectedCity && region.city !== selectedCity) return false;
      if (selectedSector && region.sector !== selectedSector) return false;
      if (selectedWard && region.ward !== selectedWard) return false;
      
      return true;
    });
  }, [reports, statusFilter, selectedState, selectedDistrict, selectedCity, selectedSector, selectedWard]);

  const getStats = () => {
    const submitted = reports.filter(r => r.status === 'Submitted').length;
    const pending = reports.filter(r => r.status === 'Pending' || r.status === 'Resources Assigned' || r.status === 'Assigned' || r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;
    
    // Dynamic points calculation
    const points = (user?.xp || 1500) + (resolved * 50);
    
    return { submitted, pending, resolved, points };
  };

  const stats = getStats();

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
              {t("Welcome to Jan Sathi! To view your dashboard progress, track your active reports, check notifications, and earn citizen XP, please sign in or register an account.")}
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
    <div className="relative pb-24 md:pb-6 space-y-8 animate-fade-in max-w-5xl mx-auto">
      
      {/* Welcome Banner */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-brand-500/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          <img
            src={user?.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150"}
            alt="Avatar"
            className="w-16 h-16 rounded-full object-cover ring-2 ring-brand-500/20"
          />
          <div className="space-y-1 text-left">
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              {t("Welcome back, ")}{user?.name.split(' ')[0] || 'Hero'}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              {t("Thank you for keeping our municipality clean and safe. Track your active reports below.")}
            </p>
          </div>
        </div>
      </section>

      {/* Statistics Cards (Grid of 4) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-left select-none">
        {/* Reports Submitted */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Submitted' ? 'All' : 'Submitted');
            setViewMode('feed');
          }}
          className={`glass p-5 rounded-2xl border flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.01] ${
            statusFilter === 'Submitted'
              ? 'border-blue-500 ring-2 ring-blue-500/10 shadow-md bg-blue-50/10'
              : 'border-slate-800/60 hover:border-blue-500/20'
          }`}
        >
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("Submitted")}</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.submitted}</span>
          </div>
        </div>

        {/* Pending */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Pending' ? 'All' : 'Pending');
            setViewMode('feed');
          }}
          className={`glass p-5 rounded-2xl border flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.01] ${
            statusFilter === 'Pending'
              ? 'border-amber-500 ring-2 ring-amber-500/10 shadow-md bg-amber-50/10'
              : 'border-slate-800/60 hover:border-amber-500/20'
          }`}
        >
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("Pending")}</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.pending}</span>
          </div>
        </div>

        {/* Resolved */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'Resolved' ? 'All' : 'Resolved');
            setViewMode('feed');
          }}
          className={`glass p-5 rounded-2xl border flex items-center gap-4 transition-all cursor-pointer hover:scale-[1.01] ${
            statusFilter === 'Resolved'
              ? 'border-emerald-500 ring-2 ring-emerald-500/10 shadow-md bg-emerald-50/10'
              : 'border-slate-800/60 hover:border-emerald-500/20'
          }`}
        >
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("Resolved")}</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.resolved}</span>
          </div>
        </div>

        {/* Community Points */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-purple-500/20 transition-all hover:scale-[1.01]">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">{t("Points")}</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{stats.points}</span>
          </div>
        </div>
      </section>

      {/* Geographic Hierarchy Location Filter Widget */}
      <section className="glass p-5 rounded-3xl border border-slate-800/60 shadow-xl space-y-4 text-left select-none animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-400" />
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-white">{t("Geographic Jurisdiction Filter")}</h3>
              <p className="text-[10px] text-slate-400 font-medium">{t("Drill down issues by State → District → City → Sector → Ward")}</p>
            </div>
          </div>
          {(selectedState || selectedDistrict || selectedCity || selectedSector || selectedWard) && (
            <button
              onClick={() => {
                setSelectedState('');
                setSelectedDistrict('');
                setSelectedCity('');
                setSelectedSector('');
                setSelectedWard('');
              }}
              className="py-1 px-3 bg-slate-900/50 hover:bg-slate-900 border border-slate-800 text-[9px] font-black uppercase tracking-wider text-rose-455 hover:text-rose-350 rounded-xl transition-all cursor-pointer"
            >
              {t("Clear Place Filters")}
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 pt-1">
          {/* State Selection */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("State")}</label>
            <select
              value={selectedState}
              onChange={(e) => {
                setSelectedState(e.target.value);
                setSelectedDistrict('');
                setSelectedCity('');
                setSelectedSector('');
                setSelectedWard('');
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold"
            >
              <option value="">{t("All States")}</option>
              {uniqueStates.map(st => (
                <option key={st} value={st}>{t(st)}</option>
              ))}
            </select>
          </div>

          {/* District Selection */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("District")}</label>
            <select
              value={selectedDistrict}
              disabled={!selectedState}
              onChange={(e) => {
                setSelectedDistrict(e.target.value);
                setSelectedCity('');
                setSelectedSector('');
                setSelectedWard('');
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">{t("All Districts")}</option>
              {uniqueDistricts.map(dist => (
                <option key={dist} value={dist}>{t(dist)}</option>
              ))}
            </select>
          </div>

          {/* City Selection */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("City")}</label>
            <select
              value={selectedCity}
              disabled={!selectedDistrict}
              onChange={(e) => {
                setSelectedCity(e.target.value);
                setSelectedSector('');
                setSelectedWard('');
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">{t("All Cities")}</option>
              {uniqueCities.map(ct => (
                <option key={ct} value={ct}>{t(ct)}</option>
              ))}
            </select>
          </div>

          {/* Sector Selection */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("Sector / Zone")}</label>
            <select
              value={selectedSector}
              disabled={!selectedCity}
              onChange={(e) => {
                setSelectedSector(e.target.value);
                setSelectedWard('');
              }}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">{t("All Sectors")}</option>
              {uniqueSectors.map(sec => (
                <option key={sec} value={sec}>{t(sec)}</option>
              ))}
            </select>
          </div>

          {/* Ward Selection */}
          <div className="space-y-1">
            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest block pl-1">{t("Ward No.")}</label>
            <select
              value={selectedWard}
              disabled={!selectedSector}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-850/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-blue-600 transition-colors cursor-pointer font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="">{t("All Wards")}</option>
              {uniqueWards.map(wd => (
                <option key={wd} value={wd}>{t(wd)}</option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Main Grid: Reports List & Submit Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Reports Timeline List */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <div className="text-left">
              <h2 className="text-xl font-bold text-white tracking-tight">{t("Recent Activity")}</h2>
              <p className="text-slate-400 text-xs mt-0.5 font-medium">
                {statusFilter === 'All' 
                  ? t("Municipal reports posted by you") 
                  : `${t("Showing filtered reports:")} ${t(statusFilter)}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle View Mode */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800/60 shrink-0">
                <button 
                  type="button"
                  onClick={() => setViewMode('feed')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'feed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t("Feed")}
                </button>
                <button 
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'map' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t("Map")}
                </button>
              </div>

              <button
                type="button"
                onClick={() => navigate('/report-issue')}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md cursor-pointer hover:scale-[1.02] hidden sm:flex"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t("Report Issue")}</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {viewMode === 'map' ? (
              <div className={`glass p-4 rounded-3xl border relative w-full h-[500px] overflow-hidden flex flex-col justify-between transition-all duration-300 ${theme === 'light' ? 'bg-slate-50/90 border-slate-200 shadow-lg' : 'bg-slate-950 border-slate-800/60'}`} onClick={() => setSelectedMapReport(null)}>
                
                {/* Leaflet Map Target Element */}
                <div id="leaflet-map-container" className="absolute inset-0 z-0 w-full h-full" style={{ background: theme === 'light' ? '#f8fafc' : '#070b13' }} />

                {/* Map Top Header bar */}
                <div className={`flex justify-between items-center z-10 backdrop-blur-md p-3 rounded-2xl border shadow-md transition-all duration-300 ${theme === 'light' ? 'bg-white/95 border-slate-200' : 'bg-slate-900/95 border-slate-800/50'}`}>
                  <div className="text-left">
                    <span className={`text-[9px] font-black uppercase tracking-widest block transition-colors duration-300 ${theme === 'light' ? 'text-blue-600' : 'text-brand-400'}`}>{t("Jan Sathi GIS Mapping")}</span>
                    <span className={`text-[10px] font-bold block transition-colors duration-300 ${theme === 'light' ? 'text-blue-950/80' : 'text-slate-350'}`}>{t("Real-time GPS Incident Tracker (70km Limit)")}</span>
                  </div>
                  
                  {/* Map Legend */}
                  <div className={`flex items-center gap-3 text-[9px] font-bold transition-colors duration-300 ${theme === 'light' ? 'text-blue-900/80' : 'text-slate-400'}`}>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />{t("Critical")}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" />{t("High")}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" />{t("Medium")}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-500" />{t("Low")}</span>
                  </div>
                </div>

                {/* Bottom Info Dialog */}
                <div className={`z-10 border p-4 rounded-2xl shadow-2xl backdrop-blur-md w-full md:max-w-md mx-auto text-left relative transition-all duration-300 ${theme === 'light' ? 'bg-white/95 border-slate-200' : 'bg-slate-950/95 border-slate-800/80'}`} onClick={(e) => e.stopPropagation()}>
                  {selectedMapReport ? (
                    <div className="space-y-2.5 animate-fade-in">
                      <button 
                        type="button"
                        onClick={() => setSelectedMapReport(null)}
                        className={`absolute top-2.5 right-2.5 cursor-pointer transition-colors ${theme === 'light' ? 'text-slate-400 hover:text-slate-600' : 'text-slate-550 hover:text-slate-350'}`}
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <div className="flex justify-between items-start gap-3">
                        <div>
                          <span className={`text-[9px] font-black uppercase tracking-widest transition-colors duration-300 ${theme === 'light' ? 'text-blue-600' : 'text-brand-400'}`}>{t(selectedMapReport.category)}</span>
                          <h4 className={`font-extrabold text-sm mt-0.5 transition-colors duration-300 ${theme === 'light' ? 'text-blue-950' : 'text-white'}`}>{t(selectedMapReport.title)}</h4>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full border text-[8px] font-black uppercase ${
                          selectedMapReport.severity === 'Critical' ? 'bg-rose-500/10 text-rose-455 border-rose-500/30' :
                          selectedMapReport.severity === 'High' ? 'bg-amber-500/10 text-amber-455 border-amber-500/30' :
                          selectedMapReport.severity === 'Medium' ? 'bg-blue-500/10 text-blue-455 border-blue-500/30' :
                          'bg-slate-850 text-slate-400 border-slate-700'
                        }`}>
                          {t(selectedMapReport.severity || "Medium")}
                        </span>
                      </div>

                      <p className={`text-[11px] line-clamp-2 leading-relaxed transition-colors duration-300 ${theme === 'light' ? 'text-blue-900/80' : 'text-slate-400'}`}>{t(selectedMapReport.description)}</p>

                      <div className={`flex items-center justify-between text-[9px] font-bold pt-2 border-t transition-colors duration-300 ${theme === 'light' ? 'border-slate-200' : 'border-slate-800/50'}`}>
                        <span className={`flex items-center gap-1 truncate pr-2 transition-colors duration-300 ${theme === 'light' ? 'text-blue-900' : 'text-slate-455'}`}>
                          <MapPin className={`w-3 h-3 shrink-0 transition-colors duration-300 ${theme === 'light' ? 'text-blue-600' : 'text-slate-550'}`} />
                          <span className="truncate">{t(selectedMapReport.location && typeof selectedMapReport.location === 'object' ? selectedMapReport.location.address : selectedMapReport.location)}</span>
                        </span>
                        <button 
                          type="button"
                          onClick={() => {
                            setExpandedReportId(selectedMapReport.id);
                            setViewMode('feed');
                            setTimeout(() => {
                              const el = document.getElementById(selectedMapReport.id);
                              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            }, 100);
                          }}
                          className={`flex items-center gap-0.5 cursor-pointer font-extrabold uppercase tracking-wide shrink-0 transition-colors duration-300 ${theme === 'light' ? 'text-blue-600 hover:text-blue-700' : 'text-blue-400 hover:text-blue-300'}`}
                        >
                          {t("Open Details")} →
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className={`text-center py-2 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors duration-300 ${theme === 'light' ? 'text-blue-900/70' : 'text-slate-500'}`}>
                      <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
                      <span>{t("Click or hover on any GPS pin on the map to inspect issue details.")}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              processedReports.length === 0 ? (
              <div className="p-12 text-center bg-slate-900/10 border border-dashed border-slate-800/40 rounded-2xl text-slate-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-slate-650 animate-pulse" />
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("No Reports Found")}</h4>
                <p className="text-[11px] text-slate-550 max-w-xs mx-auto">{t("No reports in your workspace timeline match the selected status category or place filters.")}</p>
                <button 
                  onClick={() => {
                    setStatusFilter('All');
                    setSelectedState('');
                    setSelectedDistrict('');
                    setSelectedCity('');
                    setSelectedSector('');
                    setSelectedWard('');
                  }} 
                  className="mt-3 py-1.5 px-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-blue-400 hover:text-blue-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  {t("Reset Filters")}
                </button>
              </div>
            ) : (
              processedReports
                .map((report) => (
              <div 
                key={report.id}
                onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}
                className="glass p-5 rounded-2xl border border-slate-800/60 hover:border-slate-700/60 transition-all space-y-3.5 text-left cursor-pointer hover:bg-slate-900/10 select-none"
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] text-brand-300 font-bold tracking-wider uppercase">{t(report.category)}</span>
                    <h3 className="font-bold text-base text-white mt-0.5">{t(report.title)}</h3>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wide uppercase shrink-0 ${report.statusColor}`}>
                      {t(report.status)}
                    </span>
                    {expandedReportId === report.id ? (
                      <ChevronUp className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                </div>

                <p className="text-slate-350 text-xs leading-relaxed">{t(report.description)}</p>

                {/* Media Preview Container */}
                {report.imageUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800/60 h-48 w-full bg-slate-900/50 mt-2 select-none" onClick={(e) => e.stopPropagation()}>
                    <img
                      src={report.imageUrl}
                      alt={report.title}
                      className="w-full h-full object-cover hover:scale-[1.01] transition-transform duration-300 animate-fade-in"
                    />
                  </div>
                )}
                {report.videoUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800/60 h-48 w-full bg-slate-900/50 mt-2 select-none" onClick={(e) => e.stopPropagation()}>
                    <video
                      src={report.videoUrl}
                      controls
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/40 text-[10px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{t(report.location && typeof report.location === 'object' ? report.location.address : report.location)}</span>
                    </span>
                    <span>•</span>
                    <span>{formatDate(report.date)}</span>
                  </div>
                  {report.pointsEarned > 0 && (
                    <span className="text-emerald-400">+{report.pointsEarned} {t("Community Points Earned")}</span>
                  )}
                </div>

                {/* Collapsible Resolution Details Drawer */}
                {expandedReportId === report.id && (
                  <div className="mt-4 pt-4 border-t border-slate-800/40 space-y-4 animate-fade-in text-xs" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 text-brand-400 font-extrabold uppercase tracking-widest text-[9px]">
                      <FileText className="w-3.5 h-3.5" />
                      <span>{t("Municipal Service Resolution details")}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60">
                      {report.status === 'Resolved' ? (
                        <>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Resolved On")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{formatDate(report.resolvedDate)}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Resolved By")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{t(report.resolvedBy)}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Time Taken")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{report.resourcePlan ? `${report.resourcePlan.estimatedResolutionTime} Hours` : t(report.resolutionTime)}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Total Cost")}</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-450 block text-xs">{report.resourcePlan ? `₹${report.resourcePlan.estimatedCost?.toLocaleString()}` : t(report.resolutionCost)}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Current Status")}</span>
                            <span className="font-extrabold text-blue-600 dark:text-blue-400 block text-xs uppercase tracking-wide">{t(report.status)}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Assigned Department")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{t(report.resourcePlan?.department || report.assignedDepartment || "Awaiting Assignment")}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Est. Resolution")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{report.resourcePlan ? `${report.resourcePlan.estimatedResolutionTime} Hours` : t(report.estimatedTime || "Pending Review")}</span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t("Est. Cost")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{report.resourcePlan ? `₹${report.resourcePlan.estimatedCost?.toLocaleString()}` : t(report.estimatedCost || "Pending Assessment")}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* ======= AI Resource Plan Details Card ======= */}
                    {report.resourcePlan && !report.resourcePlan.rejected && (
                      <div className="space-y-3 mt-4 pt-4 border-t border-slate-200 dark:border-slate-800/40">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-extrabold uppercase tracking-widest text-[9px]">
                          <Cpu className="w-3.5 h-3.5 animate-pulse" />
                          <span>{t("AI Resource Plan — Approved by Officer")}</span>
                          {report.resourcePlan.confidenceScore && (
                            <span className="ml-auto px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[9px] font-bold border border-emerald-200 dark:border-emerald-500/20">
                              {t("AI Confidence")} {report.resourcePlan.confidenceScore}%
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {/* Department */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Recommended Department")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{t(report.resourcePlan.department)}</span>
                          </div>
                          {/* Team */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Assigned Working Team")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{t(report.resourcePlan.teamName)}</span>
                          </div>
                          {/* Personnel */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Number of Personnel")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1">
                              <Users className="w-3 h-3 text-blue-500" />
                              {report.resourcePlan.personnelCount} {t("Workers")}
                            </span>
                          </div>
                          {/* Resolution Time */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Estimated Resolution Time")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{report.resourcePlan.estimatedResolutionTime} {t("Hours")}</span>
                          </div>
                          {/* Equipment */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Equipment & Vehicles Needed")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs flex items-center gap-1">
                              <Wrench className="w-3 h-3 text-amber-500" />
                              {t(report.resourcePlan.equipment)}
                            </span>
                          </div>
                          {/* Budget */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Estimated Budget / Cost")}</span>
                            <span className="font-extrabold text-emerald-600 dark:text-emerald-400 block text-xs">₹{report.resourcePlan.estimatedCost?.toLocaleString()}</span>
                          </div>
                          {/* Priority */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Priority Level")}</span>
                            <span className={`font-extrabold block text-xs ${
                              report.resourcePlan.priority === 'Critical' ? 'text-red-500' :
                              report.resourcePlan.priority === 'High' ? 'text-amber-500' :
                              report.resourcePlan.priority === 'Medium' ? 'text-blue-500' :
                              'text-slate-800 dark:text-slate-300'
                            }`}>{t(report.resourcePlan.priority)}</span>
                          </div>
                          {/* Completion Time */}
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/60 space-y-1">
                            <span className="block text-[8px] text-slate-500 font-bold uppercase tracking-wider">{t("Expected Completion Time")}</span>
                            <span className="font-extrabold text-slate-800 dark:text-slate-200 block text-xs">{report.resourcePlan.expectedCompletionTime}</span>
                          </div>
                        </div>

                        {/* AI Reasoning */}
                        {report.resourcePlan.reasoning && (
                          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-900/30">
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-3 h-3 text-blue-500 animate-pulse" />
                              <span className="text-[8px] text-blue-700 dark:text-blue-400 font-extrabold uppercase tracking-wider">{t("AI Strategic Reasoning Analysis")}</span>
                            </div>
                            <p className="text-[11px] text-slate-700 dark:text-slate-400 leading-relaxed">{t(report.resourcePlan.reasoning)}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Visual Progress Timeline */}
                    <div className="space-y-3 mt-4 pt-4 border-t border-slate-800/40">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider text-left">{t("Issue Status Progress Timeline")}</span>
                      
                      <div className="relative flex justify-between items-center w-full px-4 py-2">
                        {/* Background Progress Line */}
                        <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0" />
                        
                        {/* Active Progress Line */}
                        <div 
                          className="absolute top-1/2 left-4 h-0.5 bg-brand-500 -translate-y-1/2 z-0 transition-all duration-500" 
                          style={{
                            width: report.status === 'Resolved' 
                              ? 'calc(100% - 2rem)' 
                              : report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resources Assigned'
                                ? 'calc(66% - 1.3rem)' 
                                : report.status === 'Pending'
                                  ? 'calc(33% - 0.7rem)' 
                                  : '0%'
                          }}
                        />

                        {/* Step 1: Submitted */}
                        <div className="flex flex-col items-center z-10 space-y-1.5 w-16">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black bg-brand-500 border-brand-400 text-white shadow-sm">
                            1
                          </div>
                          <span className="text-[8px] font-bold text-slate-700 dark:text-brand-300 text-center leading-none">{t("Submitted")}</span>
                        </div>

                        {/* Step 2: Reviewed by Corresponding Officer */}
                        <div className="flex flex-col items-center z-10 space-y-1.5 w-24">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black transition-all duration-300 ${
                            report.status === 'Pending' || report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resources Assigned' || report.status === 'Resolved'
                              ? 'bg-brand-500 border-brand-400 text-white shadow-sm' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}>
                            2
                          </div>
                          <span className={`text-[8px] font-bold text-center leading-none ${
                            report.status === 'Pending' || report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resources Assigned' || report.status === 'Resolved'
                              ? 'text-slate-750 dark:text-brand-300' 
                              : 'text-slate-400 dark:text-slate-600'
                          }`}>{t("Reviewed by Officer")}</span>
                        </div>

                        {/* Step 3: Under Maintenance / In Progress */}
                        <div className="flex flex-col items-center z-10 space-y-1.5 w-24">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black transition-all duration-300 ${
                            report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resources Assigned' || report.status === 'Resolved'
                              ? 'bg-brand-500 border-brand-400 text-white shadow-sm' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}>
                            3
                          </div>
                          <span className={`text-[8px] font-bold text-center leading-none ${
                            report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resources Assigned' || report.status === 'Resolved'
                              ? 'text-slate-750 dark:text-brand-300' 
                              : 'text-slate-400 dark:text-slate-600'
                          }`}>{t("Under Maintenance")}</span>
                        </div>

                        {/* Step 4: Completed */}
                        <div className="flex flex-col items-center z-10 space-y-1.5 w-16">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-black transition-all duration-300 ${
                            report.status === 'Resolved'
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-sm' 
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                          }`}>
                            4
                          </div>
                          <span className={`text-[8px] font-bold text-center leading-none ${
                            report.status === 'Resolved'
                              ? 'text-emerald-500 dark:text-emerald-400' 
                              : 'text-slate-400 dark:text-slate-600'
                          }`}>{t("Completed")}</span>
                        </div>
                      </div>
                    </div>

                    {/* Resolution Audit Trail Logs */}
                    <div className="space-y-3 mt-5 pt-4 border-t border-slate-800/40">
                      <span className="block text-[9px] text-slate-500 font-bold uppercase tracking-wider text-left">{t("Resolution Activity Audit Logs")}</span>
                      
                      <div className="relative border-l-2 border-slate-200 dark:border-slate-800 ml-4 pl-6 space-y-5 text-left">
                        
                        {/* Log Item 1: Submitted */}
                        <div className="relative">
                          <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-500 border border-brand-400 text-white flex items-center justify-center text-[9px] font-bold">1</span>
                          <div>
                            <span className="block text-[10px] font-bold text-slate-700 dark:text-brand-300 uppercase">{t("Step 1: Submission Received")}</span>
                            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                              <p>• <strong>{t("Report Date/Time")}:</strong> {formatDate(report.date)} 09:30 AM</p>
                              <p>• <strong>{t("Report Location")}:</strong> {t(report.location && typeof report.location === 'object' ? report.location.address : report.location)}</p>
                              <p>• <strong>{t("Initial Severity")}:</strong> {t(report.severity || "Medium")}</p>
                            </div>
                          </div>
                        </div>

                        {/* Log Item 2: Reviewed */}
                        {(report.status === 'Pending' || report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resolved') && (
                          <div className="relative">
                            <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-500 border border-brand-400 text-white flex items-center justify-center text-[9px] font-bold">2</span>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-700 dark:text-brand-300 uppercase">{t("Step 2: Official Review Completed")}</span>
                              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                <p>• <strong>{t("Reviewed By")}:</strong> {t(report.resolvedBy || report.assignedOfficer || "Officer Sandeep Kumar")}</p>
                                <p>• <strong>{t("Department")}:</strong> {t(report.resourcePlan?.department || report.assignedDepartment || (report.category === 'Roads & Safety' ? 'Public Works' : report.category === 'Sanitation' ? 'Health & Environment' : 'Municipal Infrastructure'))}</p>
                                <p>• <strong>{t("Officer Action Note")}:</strong> {t(report.officerNote || "Confirmed report details. Dispatched field assessment crew to verify hazard limits.")}</p>
                                <p>• <strong>{t("AI Priority Rating")}:</strong> Score {report.resourcePlan?.confidenceScore || report.priorityScore || 35} ({t("Auto-calculated based on public safety impact")})</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Log Item 3: Under Maintenance */}
                        {(report.status === 'Assigned' || report.status === 'In Progress' || report.status === 'Resolved') && (
                          <div className="relative">
                            <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-brand-500 border border-brand-400 text-white flex items-center justify-center text-[9px] font-bold">3</span>
                            <div>
                              <span className="block text-[10px] font-bold text-slate-700 dark:text-brand-300 uppercase">{t("Step 3: Maintenance Works Dispatched")}</span>
                              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                <p>• <strong>{t("Dispatch Time")}:</strong> {report.resourcePlan?.approvedAt || formatDate(report.resolvedDate || report.date)} </p>
                                <p>• <strong>{t("Assigned Team")}:</strong> {t(report.resourcePlan?.teamName || report.assignedTeam || "District Civil Maintenance Works")}</p>
                                <p>• <strong>{t("Personnel")}:</strong> {report.resourcePlan?.personnelCount || 3} {t("Workers")}, {t(report.resourcePlan?.equipment || "Standard Equipment")}</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Log Item 4: Completed */}
                        {report.status === 'Resolved' && (
                          <div className="relative">
                            <span className="absolute -left-[31px] top-0.5 w-4.5 h-4.5 rounded-full bg-emerald-500 border border-emerald-400 text-white flex items-center justify-center text-[9px] font-bold">✓</span>
                            <div>
                              <span className="block text-[10px] font-bold text-emerald-500 uppercase">{t("Step 4: Issue Resolved")}</span>
                              <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                                <p>• <strong>{t("Completion Time")}:</strong> {formatDate(report.resolvedDate)} {report.resourcePlan?.expectedCompletionTime || ''}</p>
                                <p>• <strong>{t("Resolution Cost")}:</strong> {report.resourcePlan ? `₹${report.resourcePlan.estimatedCost?.toLocaleString()}` : t(report.resolutionCost)}</p>
                                <p>• <strong>{t("Labor & Resources Used")}:</strong> {report.resourcePlan ? `${report.resourcePlan.personnelCount} Workers, ${report.resourcePlan.equipment}` : t(report.laborUsed || "3 Crew Workers, 1 Utility Dispatch Vehicle")}</p>
                                <p>• <strong>{t("Final Audit Status")}:</strong> {t("Public utility operations verified safe. Case closed.")}</p>
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Action buttons (Edit, Share, View dedicated, Delete) */}
                      {user && report.userId === user.uid && (
                        <div className="flex gap-2.5 pt-4 border-t border-slate-800/40 mt-4 flex-wrap" onClick={(e) => e.stopPropagation()}>
                          <Link 
                            to={`/report/${report.id}`} 
                            className="flex-1 min-w-[80px] py-2 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center font-bold"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>{t("View Page")}</span>
                          </Link>

                          <button
                            onClick={() => {
                              const postUrl = `${window.location.origin}/report/${report.id}`;
                              navigator.clipboard.writeText(postUrl);
                              setSuccessMsg(t("Copied direct link to clipboard!"));
                              setTimeout(() => setSuccessMsg(''), 3000);
                            }}
                            className="flex-1 min-w-[80px] py-2 bg-slate-900 border border-slate-855 hover:bg-slate-800 text-slate-350 hover:text-white rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>{t("Share Link")}</span>
                          </button>
                          
                          {report.status !== 'Resolved' && (
                            <button
                              onClick={() => {
                                setEditingReport(report);
                                setEditTitle(report.title);
                                setEditCategory(report.category);
                                setEditLocation(report.location && typeof report.location === 'object' ? report.location.address : report.location);
                                setEditSeverity(report.severity || 'Low');
                                setEditDescription(report.description);
                              }}
                              className="flex-1 min-w-[80px] py-2 bg-blue-600/10 border border-blue-900/30 hover:bg-blue-600 hover:text-white text-blue-400 rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{t("Edit Details")}</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleDeleteReport(report.id)}
                            className="flex-1 min-w-[80px] py-2 bg-rose-600/15 border border-rose-900/30 hover:bg-rose-600 hover:text-white text-rose-455 rounded-xl text-[10px] font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>{t("Delete Report")}</span>
                          </button>
                        </div>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            ))))}
          </div>
        </section>

        {/* Submit Report Side Card (Desktop Only) */}
        <section className="hidden lg:block lg:col-span-1">
          <div className="glass p-6 rounded-2xl border border-slate-800/60 sticky top-24 space-y-4 text-left">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-pulse" />
                <span>{t("Submit Civic Report")}</span>
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                {t("Help fix infrastructure or safety problems. Enter the details below to notify city managers.")}
              </p>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Issue Title")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Broken Water Pipe")}
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Category")}</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800/60 rounded-xl text-xs text-slate-350 focus:outline-none focus:border-blue-600 transition-colors"
                >
                  <option value="Infrastructure">{t("Infrastructure")}</option>
                  <option value="Roads & Safety">{t("Roads & Safety")}</option>
                  <option value="Sanitation">{t("Sanitation")}</option>
                  <option value="Public Space">{t("Public Space")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Location")}</label>
                <input
                  type="text"
                  required
                  placeholder={t("e.g. Corner of Elm and 5th")}
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("Description")}</label>
                <textarea
                  required
                  rows="3"
                  placeholder={t("Provide precise details to help officers locate and verify...")}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-955 border border-slate-800/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-600 transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{t("Submit Report")}</span>
              </button>
            </form>
          </div>
        </section>

      </div>

      {/* Simulated Mobile Form Modal */}
      {isReporting && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:hidden text-left">
          <div className="glass w-full max-w-sm rounded-3xl p-6 border border-slate-800/80 space-y-4 animate-scale-up">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-white">{t("Submit Civic Report")}</h3>
                <p className="text-slate-400 text-[10px] mt-0.5">{t("Alert officers of local service disruptions")}</p>
              </div>
              <button onClick={() => setIsReporting(false)} className="p-1 text-slate-400 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateReport} className="space-y-3 pt-2">
              <input
                type="text"
                required
                placeholder={t("Issue Title")}
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/60 rounded-xl text-xs text-white placeholder-slate-500"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/60 rounded-xl text-xs text-slate-350"
              >
                <option value="Infrastructure">{t("Infrastructure")}</option>
                <option value="Roads & Safety">{t("Roads & Safety")}</option>
                <option value="Sanitation">{t("Sanitation")}</option>
              </select>
              <input
                type="text"
                required
                placeholder={t("Location / Address")}
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/60 rounded-xl text-xs text-white placeholder-slate-500"
              />
              <textarea
                required
                rows="2"
                placeholder={t("Detailed description...")}
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800/60 rounded-xl text-xs text-white placeholder-slate-500 resize-none"
              />
              <button
                type="submit"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all"
              >
                {t("Submit Report")}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MOBILE VIEW FLOATING BOTTOM NAV BAR --- */}
      <div className="fixed bottom-4 left-4 right-4 md:hidden z-40">
        <div className="glass rounded-2xl py-3 px-6 shadow-2xl border border-slate-800/80 flex items-center justify-between bg-slate-950/80">
          
          {/* Tab 1: Dashboard */}
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'dashboard' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <HomeIcon className="w-5 h-5" />
            <span className="text-[9px]">{t("Dashboard")}</span>
          </button>

          {/* Tab 2: New Report (Triggers Modal directly) */}
          <button
            onClick={() => { setActiveTab('report'); navigate('/report-issue'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'report' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-[9px]">{t("Report")}</span>
          </button>

          {/* Tab 3: Explore/Missions */}
          <button
            onClick={() => { setActiveTab('explore'); navigate('/explore'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'explore' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-5 h-5" />
            <span className="text-[9px]">{t("Missions")}</span>
          </button>

          {/* Tab 4: Settings/Profile */}
          <button
            onClick={() => { setActiveTab('settings'); navigate('/profile'); }}
            className={`flex flex-col items-center gap-1 cursor-pointer transition-colors ${
              activeTab === 'settings' ? 'text-brand-400 font-semibold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px]">{t("Settings")}</span>
          </button>

        </div>
      </div>

    </div>
  );
}
