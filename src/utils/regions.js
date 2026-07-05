export const REGIONS_DATA = {
  "Karnataka": {
    "Bengaluru Urban": {
      "Bengaluru": {
        "East Sector": ["Ward 101 - Indiranagar", "Ward 102 - Halasuru", "Ward 103 - Jeevanbhimanagar"],
        "South Sector": ["Ward 150 - Jayanagar", "Ward 151 - Koramangala", "Ward 152 - HSR Layout"],
        "West Sector": ["Ward 180 - Malleshwaram", "Ward 181 - Rajajinagar", "Ward 182 - Vijayanagar"]
      }
    },
    "Mysuru District": {
      "Mysuru": {
        "Central Zone": ["Ward 01 - Chamundeshwari", "Ward 02 - Gokulam", "Ward 03 - Vidyaranyapuram"]
      }
    }
  },
  "Maharashtra": {
    "Mumbai Suburban": {
      "Mumbai": {
        "Bandra Sector": ["Ward A - Bandra West", "Ward B - Bandra East", "Ward C - Khar"],
        "Andheri Sector": ["Ward D - Andheri West", "Ward E - Andheri East", "Ward F - Versova"]
      }
    },
    "Pune District": {
      "Pune": {
        "Kothrud Sector": ["Ward 11 - Kothrud North", "Ward 12 - Kothrud South"],
        "Shivajinagar Sector": ["Ward 15 - Shivajinagar", "Ward 16 - Deccan"]
      }
    }
  },
  "Delhi": {
    "New Delhi District": {
      "New Delhi": {
        "Connaught Place Sector": ["Ward CP-01 - Connaught Place", "Ward CP-02 - Chanakyapuri"],
        "Dwarka Sector": ["Ward DW-01 - Dwarka Sec 6", "Ward DW-02 - Dwarka Sec 10"]
      }
    }
  },
  "Tamil Nadu": {
    "Chennai District": {
      "Chennai": {
        "Central Sector": ["Ward 110 - T. Nagar", "Ward 111 - Mylapore", "Ward 112 - Adyar"],
        "North Sector": ["Ward 120 - Royapuram", "Ward 121 - Washermanpet"]
      }
    }
  }
};

export async function reverseGeocodeCoords(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    if (data && data.address) {
      const addr = data.address;
      return {
        country: addr.country || '',
        state: addr.state || '',
        district: addr.state_district || addr.county || addr.district || '',
        city: addr.city || addr.town || addr.municipality || '',
        taluka: addr.taluka || addr.subdistrict || addr.county || '',
        village: addr.village || addr.hamlet || addr.isolated_dwelling || '',
        ward: addr.ward || addr.suburb || addr.neighbourhood || '',
        postalCode: addr.postcode || '',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        displayName: data.display_name || ''
      };
    }
  } catch (err) {
    console.error("reverseGeocodeCoords failed:", err);
  }
  return {
    country: 'India',
    state: '',
    district: '',
    city: '',
    taluka: '',
    village: '',
    ward: '',
    postalCode: '',
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    displayName: ''
  };
}

export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      const match = data[0];
      const addr = match.address || {};
      return {
        country: addr.country || '',
        state: addr.state || '',
        district: addr.state_district || addr.county || addr.district || '',
        city: addr.city || addr.town || addr.municipality || '',
        taluka: addr.taluka || addr.subdistrict || addr.county || '',
        village: addr.village || addr.hamlet || addr.isolated_dwelling || '',
        ward: addr.ward || addr.suburb || addr.neighbourhood || '',
        postalCode: addr.postcode || '',
        latitude: parseFloat(match.lat),
        longitude: parseFloat(match.lon),
        displayName: match.display_name || address
      };
    }
  } catch (err) {
    console.error("geocodeAddress failed:", err);
  }
  return null;
}

export function getReportLocationDetails(report) {
  if (!report) {
    return {
      country: '',
      state: '',
      district: '',
      city: '',
      taluka: '',
      village: '',
      ward: '',
      postalCode: '',
      latitude: 0,
      longitude: 0,
      displayName: ''
    };
  }

  if (report.location && typeof report.location === 'object') {
    const loc = report.location;
    return {
      country: loc.country || '',
      state: loc.state || '',
      district: loc.district || '',
      city: loc.city || loc.town || loc.municipality || '',
      taluka: loc.taluka || loc.subdistrict || '',
      village: loc.village || '',
      ward: loc.ward || '',
      postalCode: loc.postalCode || '',
      latitude: loc.latitude || report.lat || 0,
      longitude: loc.longitude || report.lng || 0,
      displayName: loc.displayName || ''
    };
  }

  // Fallback for legacy format (do not assign random wards/states)
  return {
    country: 'India',
    state: report.regionState || '',
    district: report.regionDistrict || '',
    city: report.regionCity || '',
    taluka: report.regionCity || '',
    village: '',
    ward: report.regionWard || '',
    postalCode: '',
    latitude: report.lat || 0,
    longitude: report.lng || 0,
    displayName: report.location || ''
  };
}

export function getLocationText(loc) {
  if (!loc) return '';
  if (typeof loc === 'string') return loc;
  return loc.displayName || loc.city || loc.state || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
}

export function getReportRegion(report) {
  if (!report) return { state: '', district: '', city: '', sector: '', ward: '' };

  const details = getReportLocationDetails(report);
  return {
    state: details.state || '',
    district: details.district || '',
    city: details.city || details.district || '',
    sector: details.taluka || '',
    ward: details.ward || ''
  };
}

export function getRegionCoordinates(state, city) {
  const coordinates = {
    "Karnataka": {
      "Bengaluru": [12.9716, 77.5946],
      "Mysuru": [12.2958, 76.6394]
    },
    "Maharashtra": {
      "Mumbai": [19.0760, 72.8777],
      "Pune": [18.5204, 73.8567]
    },
    "Delhi": {
      "New Delhi": [28.6139, 77.2090]
    },
    "Tamil Nadu": {
      "Chennai": [13.0827, 80.2707]
    }
  };

  if (state && city && coordinates[state] && coordinates[state][city]) {
    return coordinates[state][city];
  }
  return [20.5937, 78.9629];
}
