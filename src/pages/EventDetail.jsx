import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { fetchMissions, joinMission, logUserActivity } from '../services/api';
import { 
  ArrowLeft, Calendar, Clock, MapPin, Shield, Users, AlertCircle, 
  CheckCircle2, Mail, Info, Gift, Check, Loader 
} from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });
  const [theme, setTheme] = useState(() => {
    return document.documentElement.classList.contains('light') ? 'light' : 'dark';
  });

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    const handleThemeChange = () => {
      setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark');
    };
    window.addEventListener('mock-auth-state-change', handleThemeChange);
    return () => {
      window.removeEventListener('mock-auth-state-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    async function loadEvent() {
      try {
        const events = await fetchMissions();
        const found = events.find(e => e.id === id);
        if (found) {
          setEvent(found);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadEvent();
  }, [id]);

  // Leaflet map renderer
  useEffect(() => {
    if (!event || !mapContainerRef.current) return;
    
    // Check if L exists on window
    const L = window.L;
    if (!L) return;

    // Use event lat/lng or default to center Bengaluru
    const lat = event.lat || 12.9716;
    const lng = event.lng || 77.5946;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        center: [lat, lng],
        zoom: 14,
        zoomControl: false,
        attributionControl: false
      });

      // CartoDB Voyager tiles
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(mapInstanceRef.current);

      // Custom marker icon
      const eventIcon = L.divIcon({
        className: 'custom-event-marker',
        html: `<div class="w-7 h-7 bg-blue-600 border-2 border-white rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 28]
      });

      L.marker([lat, lng], { icon: eventIcon }).addTo(mapInstanceRef.current)
        .bindPopup(`<div class="text-[11px] font-bold text-slate-800">${event.title}</div><div class="text-[9px] text-slate-500">${event.location}</div>`)
        .openPopup();
    } else {
      mapInstanceRef.current.setView([lat, lng], 14);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [event]);

  const handleEnroll = async () => {
    if (!user) {
      setMsg({ type: 'error', text: 'Please sign in to register for volunteer events.' });
      return;
    }

    setJoining(true);
    setMsg({ type: '', text: '' });
    try {
      const res = await joinMission(event.id);
      if (res.success) {
        setMsg({ type: 'success', text: res.message || 'You have enrolled successfully!' });
        setEvent(prev => prev ? { ...prev, spotsFilled: Math.min(prev.spotsTotal, prev.spotsFilled + 1), joined: true } : null);
        
        // Award XP + Log Activity
        await logUserActivity(
          user.uid, 
          `Joined Volunteer Event: ${event.title}`, 
          75, 
          'Volunteer Joined', 
          `Registered to volunteer at event: ${event.title}`, 
          'Completed', 
          event.id
        );
      } else {
        setMsg({ type: 'error', text: res.message || 'Enrollment failed.' });
      }
    } catch (err) {
      console.error(err);
      setMsg({ type: 'error', text: 'Failed to enroll. Please try again.' });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-md mx-auto py-20 px-6 text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-455 mx-auto" />
        <h2 className="text-xl font-bold text-white">{t("Event Not Found")}</h2>
        <p className="text-slate-400 text-sm">{t("This event could not be located in the database.")}</p>
        <Link to="/explore" className="inline-block px-5 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold">{t("Back to Explore")}</Link>
      </div>
    );
  }

  const remainingSpots = event.spotsTotal - event.spotsFilled;
  const isDeadlinePassed = new Date(event.date) < new Date();
  const organizerContact = `${event.organizer.toLowerCase().replace(/\s+/g, '')}@JanSathi-ngo.org`;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6 animate-fade-in text-left">
      {/* Back link */}
      <button 
        onClick={() => navigate('/explore')}
        className={`flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer ${
          theme === 'light' ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
        }`}
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{t("Back to Explorer Feed")}</span>
      </button>

      {/* Top Banner Header Block */}
      <div className={`relative h-64 md:h-80 w-full rounded-3xl overflow-hidden border shadow-xl ${
        theme === 'light' ? 'border-slate-200' : 'border-slate-800/80'
      }`}>
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        
        <div className="absolute bottom-6 left-6 right-6 text-left space-y-2">
          <div className="flex gap-2">
            <span className="px-3 py-0.5 rounded-full glass border border-white/10 text-[9px] font-bold text-white uppercase tracking-wider">
              {t(event.category)}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-brand-500 text-[9px] font-bold text-white uppercase tracking-wider shadow-md">
              +75 XP {t("Reward")}
            </span>
          </div>
          
          <h1 className="text-xl md:text-3xl font-black text-white tracking-tight leading-tight">
            {t(event.title)}
          </h1>
          
          <p className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
            <span>{t("Organized by:")}</span>
            <span className="text-blue-300 underline font-bold">{t(event.organizer)}</span>
            <span className="text-slate-500">•</span>
            <span>{organizerContact}</span>
          </p>
        </div>
      </div>

      {/* Messages */}
      {msg.text && (
        <div className={`p-4 rounded-xl border text-xs font-bold flex items-center gap-3 ${
          msg.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-455 border-rose-500/20'
        }`}>
          {msg.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span>{t(msg.text)}</span>
        </div>
      )}

      {/* Grid details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Side detail specs */}
        <div className="md:col-span-8 space-y-6">
          {/* Card: About / Purpose */}
          <div className={`glass p-6 rounded-2xl border ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-850'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-3 mb-4 ${
              theme === 'light' ? 'text-slate-850 border-slate-100' : 'text-white border-slate-800/40'
            }`}>
              <Info className="w-4 h-4 text-blue-400" />
              <span>{t("Event Purpose & Why Join?")}</span>
            </h3>
            
            <div className="space-y-4 text-xs leading-relaxed text-slate-300 dark:text-slate-300">
              <p className={`font-semibold ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                {t(event.description)}
              </p>
              <p className="text-slate-400 dark:text-slate-400">
                {t("This civic volunteering mission is organized in partnership with local neighborhood committees and municipal departments. By dedicating your time, you directly support local sustainability goals, earn citizen XP reputation, and improve community hygiene and aesthetics.")}
              </p>
            </div>
          </div>

          {/* Card: Specific Details Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className={`p-4 rounded-xl border space-y-1 text-left ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-850'
            }`}>
              <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider">{t("Date")}</span>
              <span className={`block font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{event.date}</span>
            </div>
            <div className={`p-4 rounded-xl border space-y-1 text-left ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-850'
            }`}>
              <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider">{t("Time")}</span>
              <span className={`block font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t(event.time)}</span>
            </div>
            <div className={`p-4 rounded-xl border space-y-1 text-left ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-850'
            }`}>
              <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider">{t("Required Items")}</span>
              <span className={`block font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t("Water, Gloves")}</span>
            </div>
            <div className={`p-4 rounded-xl border space-y-1 text-left ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-850'
            }`}>
              <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider">{t("Eligibility")}</span>
              <span className={`block font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t("All citizens (16+)")}</span>
            </div>
            <div className={`p-4 rounded-xl border space-y-1 text-left ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-850'
            }`}>
              <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider">{t("Registration Deadline")}</span>
              <span className={`block font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{event.date}</span>
            </div>
            <div className={`p-4 rounded-xl border space-y-1 text-left ${
              theme === 'light' ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/30 border-slate-850'
            }`}>
              <span className="block text-slate-500 text-[8px] uppercase font-bold tracking-wider">{t("Volunteer Benefits")}</span>
              <span className={`block font-bold text-xs ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{t("+75 XP, Certificate")}</span>
            </div>
          </div>

          {/* Card: GIS Map Venue Location */}
          <div className={`glass p-6 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-850'
          }`}>
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${
                theme === 'light' ? 'text-slate-850' : 'text-white'
              }`}>
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{t("Venue Map Location")}</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">{t(event.location)}</span>
            </div>
            
            {/* Leaflet map container */}
            <div 
              ref={mapContainerRef} 
              className="h-60 w-full rounded-xl border border-slate-800/40 shadow-inner z-0 overflow-hidden" 
            />
          </div>
        </div>

        {/* Right Side summary drawer widgets */}
        <div className="md:col-span-4 space-y-6">
          {/* Card: Registration overview slots */}
          <div className={`glass p-6 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-850'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-3 ${
              theme === 'light' ? 'text-slate-850 border-slate-100' : 'text-white border-slate-800/40'
            }`}>
              <Users className="w-4 h-4 text-blue-400" />
              <span>{t("Slots & Enrollment")}</span>
            </h3>

            <div className="space-y-3">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-450">{t("Total Capacity:")}</span>
                <span className={`font-extrabold ${theme === 'light' ? 'text-slate-800' : 'text-white'}`}>{event.spotsTotal} {t("volunteers")}</span>
              </div>
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-450">{t("Slots Left:")}</span>
                <span className={`font-extrabold ${remainingSpots > 0 ? 'text-blue-400' : 'text-rose-400'}`}>
                  {remainingSpots > 0 ? `${remainingSpots} ${t("slots left")}` : t("Full")}
                </span>
              </div>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="w-full bg-slate-800/40 h-2 rounded-full overflow-hidden border border-slate-800/20">
                  <div
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(event.spotsFilled / event.spotsTotal) * 100}%` }}
                  />
                </div>
                <div className="text-[9px] text-slate-500 text-right font-semibold">
                  {Math.round((event.spotsFilled / event.spotsTotal) * 100)}% {t("filled")}
                </div>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleEnroll}
              disabled={event.joined || remainingSpots <= 0 || joining || isDeadlinePassed}
              className={`w-full py-3.5 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
                event.joined
                  ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 cursor-not-allowed'
                  : remainingSpots <= 0
                  ? 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'
                  : isDeadlinePassed
                  ? 'bg-slate-800/80 border border-slate-700 text-slate-500 cursor-not-allowed'
                  : joining
                  ? 'bg-blue-600/40 text-blue-300'
                  : 'bg-blue-600 hover:bg-blue-500 text-white hover:scale-[1.01]'
              }`}
            >
              {joining ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>{t("Processing...")}</span>
                </>
              ) : event.joined ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t("Registered & Enrolled")}</span>
                </>
              ) : remainingSpots <= 0 ? (
                <span>{t("Event Full")}</span>
              ) : isDeadlinePassed ? (
                <span>{t("Registration Closed")}</span>
              ) : (
                <span>{t("Enroll / Register Now")}</span>
              )}
            </button>
          </div>

          {/* Card: Gamification specs */}
          <div className={`glass p-6 rounded-2xl border space-y-4 ${
            theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/40 border-slate-850'
          }`}>
            <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b pb-3 ${
              theme === 'light' ? 'text-slate-850 border-slate-100' : 'text-white border-slate-800/40'
            }`}>
              <Gift className="w-4 h-4 text-blue-400" />
              <span>{t("Guild Rewards")}</span>
            </h3>

            <ul className="space-y-2.5 text-xs text-slate-400 font-semibold leading-relaxed">
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>+75 XP reputation points added to profile</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>3 Certified Volunteer Hours logged</span>
              </li>
              <li className="flex items-center gap-2 text-slate-300">
                <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>Unlocks "Volunteer Active" badge status</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
