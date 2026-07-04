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

  if (report.regionState && report.regionDistrict && report.regionCity && report.regionSector && report.regionWard) {
    return {
      state: report.regionState,
      district: report.regionDistrict,
      city: report.regionCity,
      sector: report.regionSector,
      ward: report.regionWard
    };
  }

  const idStr = report.id || report.title || 'default-id';
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);

  const states = Object.keys(REGIONS_DATA);
  const state = states[hash % states.length];

  const districts = Object.keys(REGIONS_DATA[state]);
  const district = districts[hash % districts.length];

  const cities = Object.keys(REGIONS_DATA[state][district]);
  const city = cities[hash % cities.length];

  const sectors = Object.keys(REGIONS_DATA[state][district][city]);
  const sector = sectors[hash % sectors.length];

  const wards = REGIONS_DATA[state][district][city][sector];
  const ward = wards[hash % wards.length];

  return { state, district, city, sector, ward };
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
