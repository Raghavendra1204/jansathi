import React, { useEffect, useRef, useState } from 'react';
import { Loader, MapPin } from 'lucide-react';

export default function MapSelector({ onLocationSelect, locationText }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markerRef = useRef(null);
  const lastGeocodedText = useRef('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpsFetching, setGpsFetching] = useState(false);

  useEffect(() => {
    // Dynamically load Leaflet CSS and JS from UNPKG CDN to avoid bundle inflation
    const loadLeaflet = () => {
      if (window.L) {
        setLoading(false);
        return;
      }

      // Inject Leaflet CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);

      // Inject Leaflet JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.async = true;
      script.onload = () => {
        setLoading(false);
      };
      script.onerror = () => {
        setError('Failed to load mapping library.');
        setLoading(false);
      };
      document.body.appendChild(script);
    };

    loadLeaflet();
  }, []);

  useEffect(() => {
    if (loading || error || !window.L || !mapRef.current) return;

    if (!leafletMap.current) {
      // Default: Bengaluru Center
      const defaultCenter = [12.9716, 77.5946];

      // Initialize map instance
      leafletMap.current = window.L.map(mapRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(defaultCenter, 13);

      // Load dark-themed CartoDB map tiles matching glassmorphism style
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(leafletMap.current);

      // Create a clean custom blue marker divIcon
      const customIcon = window.L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #3b82f6; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 0 12px #3b82f6;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      // Add draggable marker to map center
      markerRef.current = window.L.marker(defaultCenter, {
        draggable: true,
        icon: customIcon
      }).addTo(leafletMap.current);

      // Reverse geocode default center to populate address
      reverseGeocode(defaultCenter[0], defaultCenter[1]);

      // Register click handler to move marker and update coordinates
      leafletMap.current.on('click', (e) => {
        const { lat, lng } = e.latlng;
        markerRef.current.setLatLng([lat, lng]);
        reverseGeocode(lat, lng);
      });

      // Register drag handler on marker
      markerRef.current.on('dragend', () => {
        const { lat, lng } = markerRef.current.getLatLng();
        reverseGeocode(lat, lng);
      });
    }
  }, [loading, error]);

  useEffect(() => {
    if (!locationText || !leafletMap.current || !markerRef.current || !window.L) return;
    if (locationText === lastGeocodedText.current) return;

    const delayDebounce = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationText)}&limit=1`,
          { headers: { 'Accept-Language': 'en' } }
        );
        const data = await response.json();
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          
          lastGeocodedText.current = locationText;
          
          leafletMap.current.setView([lat, lng], 15);
          markerRef.current.setLatLng([lat, lng]);
          
          onLocationSelect(locationText, lat, lng);
        }
      } catch (err) {
        console.error("Geocoding failed:", err);
      }
    }, 1500);

    return () => clearTimeout(delayDebounce);
  }, [locationText]);

  // Translate coordinates to a readable address using OSM Nominatim reverse geocoder
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await response.json();
      if (data && data.display_name) {
        onLocationSelect(data.display_name, lat, lng);
      } else {
        onLocationSelect(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° W`, lat, lng);
      }
    } catch (err) {
      console.error("Reverse geocoding failed:", err);
      onLocationSelect(`${lat.toFixed(5)}° N, ${lng.toFixed(5)}° W`, lat, lng);
    }
  };

  // Obtain user's live GPS coordinates via HTML Geolocation API
  const handleLiveLocation = () => {
    if (!navigator.geolocation) {
      alert("Your browser does not support Geolocation services.");
      return;
    }

    setGpsFetching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (leafletMap.current && markerRef.current) {
          leafletMap.current.setView([latitude, longitude], 15);
          markerRef.current.setLatLng([latitude, longitude]);
          reverseGeocode(latitude, longitude);
        }
        setGpsFetching(false);
      },
      (err) => {
        console.error("Geolocation fetch failed:", err);
        alert("Unable to fetch live GPS location. Please verify location permissions.");
        setGpsFetching(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  if (loading) {
    return (
      <div className="h-44 bg-slate-900/50 rounded-2xl border border-slate-800/60 flex items-center justify-center">
        <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-44 bg-slate-900/50 rounded-2xl border border-slate-800/60 flex items-center justify-center text-xs text-rose-450 font-bold">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-2 relative">
      <div 
        ref={mapRef} 
        className="h-48 w-full rounded-2xl overflow-hidden border border-slate-800/60 shadow-md relative"
        style={{ zIndex: 10 }}
      />
      <button
        type="button"
        onClick={handleLiveLocation}
        disabled={gpsFetching}
        className="absolute bottom-3 right-3 z-[1000] px-3.5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white rounded-xl shadow-xl transition-all flex items-center gap-1.5 text-[10px] font-bold cursor-pointer shrink-0 border border-blue-500/20"
      >
        {gpsFetching ? (
          <>
            <Loader className="w-3.5 h-3.5 animate-spin" />
            <span>Locating...</span>
          </>
        ) : (
          <>
            <MapPin className="w-3.5 h-3.5" />
            <span>Use Live GPS</span>
          </>
        )}
      </button>
    </div>
  );
}
