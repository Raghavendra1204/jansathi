import { db, isMockFirebase } from '../firebase/config';
import { collection, doc, getDocs, updateDoc } from 'firebase/firestore';
import { reverseGeocode, geocodeAddress } from './regions';

export async function runLocationDatabaseMigration(onProgress) {
  console.log("Starting location database migration...");
  
  let reports = [];
  
  if (isMockFirebase) {
    reports = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
  } else {
    try {
      const querySnapshot = await getDocs(collection(db, 'reports'));
      querySnapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() });
      });
    } catch (err) {
      console.error("Failed to fetch reports from Firestore for migration:", err);
      return { success: false, error: err.message };
    }
  }

  // Filter out reports that already have a structured location object
  const unmigratedReports = reports.filter(r => !r.location || typeof r.location !== 'object');
  
  if (unmigratedReports.length === 0) {
    console.log("All reports are already migrated to the structured location schema.");
    return { success: true, migratedCount: 0 };
  }

  console.log(`Found ${unmigratedReports.length} unmigrated reports. Beginning Nominatim migration...`);
  
  let migratedCount = 0;
  
  for (let i = 0; i < unmigratedReports.length; i++) {
    const r = unmigratedReports[i];
    if (onProgress) {
      onProgress(migratedCount + 1, unmigratedReports.length, r.title);
    }
    
    let parsedLoc = null;
    const textAddress = typeof r.location === 'string' ? r.location : (r.title || 'Unknown Location');
    
    // Check if report has non-default coordinates
    const hasCoordinates = r.lat && r.lng && (r.lat !== 12.9716 || r.lng !== 77.5946);
    
    if (hasCoordinates) {
      console.log(`[Migration] Reverse geocoding coordinates [${r.lat}, ${r.lng}] for report: ${r.title}`);
      parsedLoc = await reverseGeocode(r.lat, r.lng);
    }
    
    if (!parsedLoc && textAddress) {
      console.log(`[Migration] Geocoding text address "${textAddress}" for report: ${r.title}`);
      parsedLoc = await geocodeAddress(textAddress);
    }
    
    // Construct structured location object, fallback to flat fields or defaults if geocoding failed
    const locObj = {
      country: (parsedLoc && parsedLoc.country) || 'India',
      state: (parsedLoc && parsedLoc.state) || r.regionState || 'Karnataka',
      district: (parsedLoc && parsedLoc.district) || r.regionDistrict || 'Bengaluru Urban',
      city: (parsedLoc && parsedLoc.city) || r.regionCity || 'Bengaluru',
      taluka: (parsedLoc && parsedLoc.taluka) || r.regionSector || 'East Sector',
      village: (parsedLoc && parsedLoc.village) || '',
      ward: (parsedLoc && parsedLoc.ward) || r.regionWard || 'Unknown Ward',
      postalCode: (parsedLoc && parsedLoc.postalCode) || '',
      latitude: (parsedLoc && parsedLoc.latitude) || r.lat || 12.9716,
      longitude: (parsedLoc && parsedLoc.longitude) || r.lng || 77.5946,
      address: textAddress
    };

    // Store in database
    if (isMockFirebase) {
      const allMock = JSON.parse(localStorage.getItem('jan_sathi_reports') || '[]');
      const index = allMock.findIndex(item => item.id === r.id);
      if (index !== -1) {
        allMock[index].location = locObj;
        localStorage.setItem('jan_sathi_reports', JSON.stringify(allMock));
      }
    } else {
      try {
        const docRef = doc(db, 'reports', r.id);
        await updateDoc(docRef, { location: locObj });
      } catch (dbErr) {
        console.error(`[Migration] Failed to save structured location for report ${r.id}:`, dbErr);
      }
    }
    
    migratedCount++;
    console.log(`[Migration] successfully migrated report ${migratedCount}/${unmigratedReports.length}: "${r.title}"`);
    
    // Throttle API requests to respect OpenStreetMap Nominatim guidelines (1 sec delay)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log("Location database migration finished successfully.");
  return { success: true, migratedCount };
}
