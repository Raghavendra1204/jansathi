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

export function getReportRegion(report) {
  if (!report) return { state: '', district: '', city: '', sector: '', ward: '' };

  // If a structured location object exists
  if (report.location && typeof report.location === 'object') {
    const loc = report.location;
    return {
      state: loc.state || '',
      district: loc.district || '',
      city: loc.city || loc.district || '',
      sector: loc.taluka || '',
      ward: loc.ward || 'Unknown Ward'
    };
  }

  // Fallback to legacy/flat fields (e.g. if regionState exists on report directly)
  if (report.regionState) {
    return {
      state: report.regionState || '',
      district: report.regionDistrict || '',
      city: report.regionCity || '',
      sector: report.regionSector || '',
      ward: report.regionWard || 'Unknown Ward'
    };
  }

  // If no location structure at all, do NOT assign random values. Return empty/unknown!
  return {
    state: 'Unknown State',
    district: 'Unknown District',
    city: 'Unknown City',
    sector: 'Unknown Sector',
    ward: 'Unknown Ward'
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

export async function reverseGeocode(lat, lng) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { 'User-Agent': 'JanSathi-App/1.0' } }
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    
    if (data && data.address) {
      const addr = data.address;
      
      return {
        country: addr.country || '',
        state: addr.state || '',
        district: addr.state_district || addr.county || addr.district || '',
        city: addr.city || addr.town || addr.municipality || addr.suburb || '',
        taluka: addr.county || addr.subdistrict || addr.taluk || '',
        village: addr.village || addr.neighbourhood || addr.suburb || addr.hamlet || '',
        ward: addr.ward || '',
        postalCode: addr.postcode || '',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
        address: data.display_name || ''
      };
    }
  } catch (error) {
    console.error("Reverse geocoding failed:", error);
  }
  return null;
}

export async function geocodeAddress(address) {
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`,
      { headers: { 'User-Agent': 'JanSathi-App/1.0' } }
    );
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    const data = await response.json();
    
    if (data && data.length > 0) {
      const first = data[0];
      const addr = first.address || {};
      
      return {
        country: addr.country || '',
        state: addr.state || '',
        district: addr.state_district || addr.county || addr.district || '',
        city: addr.city || addr.town || addr.municipality || addr.suburb || '',
        taluka: addr.county || addr.subdistrict || addr.taluk || '',
        village: addr.village || addr.neighbourhood || addr.suburb || addr.hamlet || '',
        ward: addr.ward || '',
        postalCode: addr.postcode || '',
        latitude: parseFloat(first.lat),
        longitude: parseFloat(first.lon),
        address: first.display_name || address
      };
    }
  } catch (error) {
    console.error("Geocoding address failed:", error);
  }
  return null;
}
