import React, { createContext, useContext, useState, useEffect } from 'react';
import { translateTextWithGemini } from '../services/gemini';

const TranslationContext = createContext();

// Predefined translation dictionary for core UI elements (Hindi, Telugu, Kannada, Tamil)
const STATIC_DICTIONARY = {
  hi: {
    // Sidebar & User Role
    "Portal Workspace": "पोर्टल वर्कस्पेस",
    "Citizen": "नागरिक",
    "Officer": "अधिकारी",
    "Home Feed": "होम फ़ीड",
    "Dashboard": "डैशबोर्ड",
    "Profile": "प्रोफ़ाइल",
    "Communities": "समुदाय",
    "Events": "कार्यक्रम",
    "AI Assistant": "एआई सहायक",
    "Documents": "दस्तावेज़",
    "Messages": "संदेश",
    "Notifications": "सूचनाएं",
    "Security": "सुरक्षा",
    "Settings": "सेटिंग्स",
    "Logout": "लॉगआउट",
    
    // Overview metrics
    "Citizen Portal Workspace": "नागरिक पोर्टल वर्कस्पेस",
    "Level": "स्तर",
    "Progress to Next Level": "अगले स्तर की प्रगति",
    "Hours Volunteered": "स्वयंसेवा घंटे",
    "Reports Filed": "दर्ज रिपोर्ट",
    "Missions Completed": "पूर्ण मिशन",
    "Official Verification": "आधिकारिक सत्यापन",
    "Verified Citizen status": "सत्यापित नागरिक स्थिति",
    "Contribution Timeline": "योगदान समयरेखा",
    
    // Section headers
    "Account Information": "खाता जानकारी",
    "Gamified Achievements Catalog": "गेमीफाइड उपलब्धियां सूची",
    "Active Registered Missions": "सक्रिय पंजीकृत मिशन",
    "Municipal Center Hubs": "नगर केंद्र हब",
    "Document Verification appeal": "दस्तावेज़ सत्यापन अपील",
    "Security configurations": "सुरक्षा विन्यास",
    "System Preferences": "सिस्टम प्राथमिकताएं",

    // Citizen Dashboard Specifics
    "Welcome back, ": "आपका स्वागत है, ",
    "Welcome back,": "आपका स्वागत है,",
    "Thank you for keeping our municipality clean and safe. Track your active reports below.": "हमारी नगर पालिका को साफ और सुरक्षित रखने के लिए धन्यवाद। नीचे अपनी सक्रिय रिपोर्ट ट्रैक करें।",
    "Submitted": "जमा की गई",
    "Pending": "लंबित",
    "Resolved": "सुलझाया गया",
    "Points": "अंक",
    "Recent Activity": "हाल की गतिविधि",
    "Municipal reports posted by you": "आपके द्वारा पोस्ट की गई नगरपालिका रिपोर्ट",
    "Report Issue": "समस्या दर्ज करें",
    "Submit Civic Report": "नागरिक रिपोर्ट जमा करें",
    "Help fix infrastructure or safety problems. Enter the details below to notify city managers.": "बुनियादी ढांचे या सुरक्षा समस्याओं को ठीक करने में मदद करें। शहर के प्रबंधकों को सूचित करने के लिए नीचे विवरण दर्ज करें।",
    "Issue Title": "समस्या का शीर्षक",
    "Category": "श्रेणी",
    "Location": "स्थान",
    "Description": "विवरण",
    "Submit Report": "रिपोर्ट जमा करें",
    "Missions": "मिशन",
    "Progress": "प्रगति",
    "Infrastructure": "बुनियादी ढांचा",
    "Roads & Safety": "सड़कें और सुरक्षा",
    "Sanitation": "स्वच्छता",
    "Public Space": "सार्वजनिक स्थान",
    "Community Points Earned": "अर्जित किए गए कम्युनिटी अंक",

    // Default mock data categories & values
    "Broken Streetlight": "टूटी हुई स्ट्रीटलाइट",
    "Pothole in Right Lane": "दाहिनी लेन में गड्ढा",
    "Overflowing Dumpster": "ओवरफ्लो कचरा पेटी",
    "Damaged Guardrail": "क्षतिग्रस्त रेलिंग"
  },
  te: {
    // Sidebar & User Role
    "Portal Workspace": "పోర్టల్ వర్క్‌స్పేస్",
    "Citizen": "పౌరుడు",
    "Officer": "అధికారి",
    "Home Feed": "హోమ్ ఫీడ్",
    "Dashboard": "డాష్‌బోర్డ్",
    "Profile": "ప్రొఫైల్",
    "Communities": "కమ్యూనిటీలు",
    "Events": "కార్యక్రమాలు",
    "AI Assistant": "ఏఐ అసిస్టెంట్",
    "Documents": "పత్రాలు",
    "Messages": "సందేశాలు",
    "Notifications": "నోటిఫికేషన్లు",
    "Security": "భద్రత",
    "Settings": "సెట్టింగులు",
    "Logout": "లాగ్ అవుట్",

    // Overview metrics
    "Citizen Portal Workspace": "సిటిజెన్ పోర్టల్ వర్క్‌స్పేస్",
    "Level": "స్థాయి",
    "Progress to Next Level": "తదుపరి స్థాయికి పురోగతి",
    "Hours Volunteered": "స్వచ్ఛంద గంటలు",
    "Reports Filed": "దాఖలైన నిвеదికలు",
    "Missions Completed": "పూర్తయిన మిషన్లు",
    "Official Verification": "అధికారిక ధృవీకరణ",
    "Verified Citizen status": "ధృవీకరించబడిన పౌరుడి స్థితి",
    "Contribution Timeline": "సహకార కాలక్రమం",

    // Section headers
    "Account Information": "ఖాతా సమాచారం",
    "Gamified Achievements Catalog": "గేమిఫైడ్ విజయాల జాబితా",
    "Active Registered Missions": "ಸಕ್ರೀಯ నమోದಿತ మిషన్లు",
    "Municipal Center Hubs": "మునిసిపల్ కేంద్ర హబ్‌లు",
    "Document Verification appeal": "పత్రాల ధృవీకరణ అభ్యర్థన",
    "Security configurations": "భద్రతా కాన్ఫిగరేషన్లు",
    "System Preferences": "సిస్టమ్ ప్రాధాన్యతలు",

    // Citizen Dashboard Specifics
    "Welcome back, ": "స్వాగతం, ",
    "Welcome back,": "స్వాగతం,",
    "Thank you for keeping our municipality clean and safe. Track your active reports below.": "మన మునిసిపాలిటీని పరిశుభ్రంగా మరియు సురక్షితంగా ఉంచినందుకు ధన్యవాదాలు. మీ క్రియాశీల నివేదికలను క్రింద ట్రాక్ చేయండి.",
    "Submitted": "సమర్పించినవి",
    "Pending": "పెండింగ్",
    "Resolved": "పరిష్కరించబడినవి",
    "Points": "పాయింట్లు",
    "Recent Activity": "ఇటీవలి కార్యాచరణ",
    "Municipal reports posted by you": "మీరు పోస్ట్ చేసిన మునిసిపల్ నివేదికలు",
    "Report Issue": "సమస్యను నివేదించండి",
    "Submit Civic Report": "సివిక్ నివేదికను సమర్పించండి",
    "Help fix infrastructure or safety problems. Enter the details below to notify city managers.": "మౌలిక సదుపాయాలు లేదా భద్రతా సమస్యలను పరిష్కరించడంలో సహాయపడండి. నగర నిర్వాహకులకు తెలియజేయడానికి క్రింద వివరాలను నమోదు చేయండి.",
    "Issue Title": "సమస్య శీర్షిక",
    "Category": "వర్గం",
    "Location": "స్థానం",
    "Description": "వివరణ",
    "Submit Report": "निवेదికను సమర్పించండి",
    "Missions": "మిషన్లు",
    "Progress": "పురోగతి",
    "Infrastructure": "మౌలిక సదుపాయాలు",
    "Roads & Safety": "రోడ్లు & భద్రత",
    "Sanitation": "పారిశుధ్యం",
    "Public Space": "పబ్లిక్ స్థలం",
    "Community Points Earned": "కమ్యూనిటీ పాయింట్లు సంపాదించారు",

    // Default mock data categories & values
    "Broken Streetlight": "విరిగిపోయిన వీధి దీపం",
    "Pothole in Right Lane": "కుడి లేన్‌లో గుంత",
    "Overflowing Dumpster": "నిండిపోయిన చెత్తకుండీ",
    "Damaged Guardrail": "దెబ్బతిన్న గార్డ్‌రైల్"
  },
  kn: {
    // Sidebar & User Role
    "Portal Workspace": "ಪೋರ್ಟಲ್ ವರ್ಕ್‌ಸ್ಪೇಸ್",
    "Citizen": "ನಾಗರಿಕ",
    "Officer": "ಅಧಿಕಾರಿ",
    "Home Feed": "ಹೋಮ್ ಫೀಡ್",
    "Dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "Profile": "ಪ್ರೊಫೈಲ್",
    "Communities": "ಸಮುದಾಯಗಳು",
    "Events": "ಕಾರ್ಯಕ್ರಮಗಳು",
    "AI Assistant": "ಎಐ ಸಹಾಯಕ",
    "Documents": "ದಾಖಲೆಗಳು",
    "Messages": "ಸಂದೇಶಗಳು",
    "Notifications": "ಅಧಿಸೂಚನೆಗಳು",
    "Security": "ಭದ್ರತೆ",
    "Settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "Logout": "ಲಾಗೌಟ್",

    // Overview metrics
    "Citizen Portal Workspace": "ನಾಗರಿಕ ಪೋರ್ಟಲ್ ವರ್ಕ್‌ಸ್ಪೇಸ್",
    "Level": "ಹಂತ",
    "Progress to Next Level": "ಮುಂದಿನ ಹಂತದ ಪ್ರಗತಿ",
    "Hours Volunteered": "ಸ್ವಯಂಸೇವಾ ಗಂಟೆಗಳು",
    "Reports Filed": "ದಾಖಲಾದ ವರದಿಗಳು",
    "Missions Completed": "ಪೂರ್ಣಗೊಂಡ ಮಿಷನ್‌ಗಳು",
    "Official Verification": "ಅಧಿಕೃತ ಪರಿಶೀಲನೆ",
    "Verified Citizen status": "ಪರಿಶೀಲಿಸಿದ ನಾಗರಿಕ ಸ್ಥಿತಿ",
    "Contribution Timeline": "ಕೊಡುಗೆಯ ಟೈಮ್‌ಲೈನ್",

    // Section headers
    "Account Information": "ಖಾತೆ ಮಾಹಿತಿ",
    "Gamified Achievements Catalog": "ಸಾಧನೆಗಳ ಪಟ್ಟಿ",
    "Active Registered Missions": "ಸಕ್ರಿಯ ನೋಂದಾಯಿತ ಮಿಷನ್‌ಗಳು",
    "Municipal Center Hubs": "ನಗರ್ ಕೇಂದ್ರ ಹಬ್‌ಗಳು",
    "Document Verification appeal": "ದಾಖಲೆ ಪರಿಶೀಲನೆ ಮನವಿ",
    "Security configurations": "ಭದ್ರತಾ ಕಾನ್ಫಿಗರೇಶನ್‌ಗಳು",
    "System Preferences": "ಸಿಸ್ಟಮ್ ಆದ್ಯತೆಗಳು",

    // Citizen Dashboard Specifics
    "Welcome back, ": "ಸ್ವಾಗತ, ",
    "Welcome back,": "ಸ್ವಾಗತ,",
    "Thank you for keeping our municipality clean and safe. Track your active reports below.": "ನಮ್ಮ ಪುರಸಭೆಯನ್ನು ಸ್ವಚ್ಛವಾಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿಟ್ಟಿದ್ದಕ್ಕಾಗಿ ಧನ್ಯವಾದಗಳು. ನಿಮ್ಮ ಸಕ್ರಿಯ ವರದಿಗಳನ್ನು ಕೆಳಗೆ ಟ್ರ್ಯಾಕ್ ಮಾಡಿ.",
    "Submitted": "ಸಲ್ಲಿಸಲಾಗಿದೆ",
    "Pending": "ಬಾಕಿ ಉಳಿದಿದೆ",
    "Resolved": "ಪರಿಹರಿಸಲಾಗಿದೆ",
    "Points": "ಅಂಕಗಳು",
    "Recent Activity": "ಇತ್ತೀಚಿನ ಚಟುವಟಿಕೆ",
    "Municipal reports posted by you": "ನೀವು ಪೋಸ್ಟ್ ಮಾಡಿದ ಪುರಸಭೆಯ ವರದಿಗಳು",
    "Report Issue": "ಸಮಸ್ಯೆಯನ್ನು ವರದಿ ಮಾಡಿ",
    "Submit Civic Report": "ನಾಗರಿಕ ವರದಿಯನ್ನು ಸಲ್ಲಿಸಿ",
    "Help fix infrastructure or safety problems. Enter the details below to notify city managers.": "ಮೂಲಸೌಕರ್ಯ ಅಥವಾ ಸುರಕ್ಷತೆಯ ಸಮಸ್ಯೆಗಳನ್ನು ಸರಿಪಡಿಸಲು ಸಹಾಯ ಮಾಡಿ. ನಗರ ವ್ಯವಸ್ಥಾಪಕರಿಗೆ ತಿಳಿಸಲು ಕೆಳಗಿನ ವಿವರಗಳನ್ನು ನಮೂದಿಸಿ.",
    "Issue Title": "ಸಮಸ್ಯೆಯ ಶೀರ್ಷಿಕೆ",
    "Category": "ವರ್ಗ",
    "Location": "ಸ್ಥಳ",
    "Description": "ವಿವರಣೆ",
    "Submit Report": "ವರದಿಯನ್ನು ಸಲ್ಲಿಸಿ",
    "Missions": "ಮಿಷನ್‌ಗಳು",
    "Progress": "ಪ್ರಗತಿ",
    "Infrastructure": "ಮೂಲಸೌಕರ್ಯ",
    "Roads & Safety": "ರಸ್ತೆಗಳು ಮತ್ತು ಸುರಕ್ಷತೆ",
    "Sanitation": "ನೈರ್ಮಲ್ಯ",
    "Public Space": "ಸಾರ್ವಜನಿಕ ಸ್ಥಳ",
    "Community Points Earned": "ಗಳಿಸಿದ ಕಮ್ಯೂನಿಟಿ ಪಾಯಿಂಟ್‌ಗಳು",

    // Default mock data categories & values
    "Broken Streetlight": "ಮುರಿದ ಬೀದಿ ದೀಪ",
    "Pothole in Right Lane": "ಬಲ ಲೇನ್‌ನಲ್ಲಿ ಗುಂಡಿ",
    "Overflowing Dumpster": "ಉಕ್ಕಿ ಹರಿಯುತ್ತಿರುವ ಕಸದ ಬುಟ್ಟಿ",
    "Damaged Guardrail": "ಹಾನಿಗೊಳಗಾದ ಗಾರ್ಡ್‌ರೈಲ್"
  },
  ta: {
    // Sidebar & User Role
    "Portal Workspace": "வலைவாசல் பணிமனை",
    "Citizen": "குடிமகன்",
    "Officer": "அதிகாரி",
    "Home Feed": "முகப்பு ஊட்டம்",
    "Dashboard": "டாஷ்போர்டு",
    "Profile": "சுயவிவரம்",
    "Communities": "சமூகங்கள்",
    "Events": "நிகழ்வுகள்",
    "AI Assistant": "செயற்கை நுண்ணறிவு உதவியாளர்",
    "Documents": "ஆவணங்கள்",
    "Messages": "செய்திகள்",
    "Notifications": "அறிவிப்புகள்",
    "Security": "பாதுகாப்பு",
    "Settings": "அமைப்புகள்",
    "Logout": "வெளியேறு",

    // Overview metrics
    "Citizen Portal Workspace": "குடிமகன் வலைவாசல் பணிமனை",
    "Level": "நிலை",
    "Progress to Next Level": "அடுத்த நிலைக்கு முன்னேற்றம்",
    "Hours Volunteered": "ஸ்வயம்சேவை மணிநேரம்",
    "Reports Filed": "தாக்கல் செய்யப்பட்ட அறிக்கைகள்",
    "Missions Completed": "முடிந்த பணிகள்",
    "Official Verification": "அதிகாரப்பூர்வ சரிபார்ப்பு",
    "Verified Citizen status": "சரிபார்க்கப்பட்ட குடிமகன் நிலை",
    "Contribution Timeline": "பங்களிப்பு காலவரிசை",

    // Section headers
    "Account Information": "கணக்கு தகவல்",
    "Gamified Achievements Catalog": "சாதனைகள் பட்டியல்",
    "Active Registered Missions": "செயலில் உள்ள பதிவு செய்யப்பட்ட பணிகள்",
    "Municipal Center Hubs": "நகராட்சி மைய மையங்கள்",
    "Document Verification appeal": "ஆவண சரிபார்ப்பு மேல்முறையீடு",
    "Security configurations": "பாகாப்பு கட்டமைப்புகள்",
    "System Preferences": "அமைப்பு விருப்பங்கள்",

    // Citizen Dashboard Specifics
    "Welcome back, ": "மீண்டும் வரவேற்கிறோம், ",
    "Welcome back,": "மீண்டும் வரவேற்கிறோம்,",
    "Thank you for keeping our municipality clean and safe. Track your active reports below.": "எங்கள் நகராட்சியை சுத்தமாகவும் பாதுகாப்பாகவும் வைத்திருப்பதற்கு நன்றி. உங்கள் செயலில் உள்ள அறிக்கைகளை கீழே கண்காணிக்கவும்.",
    "Submitted": "சமர்ப்பிக்கப்பட்டது",
    "Pending": "நிலுவையில் உள்ளது",
    "Resolved": "தீர்க்கப்பட்டது",
    "Points": "புள்ளிகள்",
    "Recent Activity": "சமீபத்திய செயல்பாடு",
    "Municipal reports posted by you": "உங்களால் இடுகையிடப்பட்ட நகராட்சி அறிக்கைகள்",
    "Report Issue": "சிக்கலைப் புகாரளிக்கவும்",
    "Submit Civic Report": "குடிமை அறிக்கையைச் சமர்ப்பிக்கவும்",
    "Help fix infrastructure or safety problems. Enter the details below to notify city managers.": "கட்டமைப்பு அல்லது பாதுகாப்பு சிக்கல்களை சரிசெய்ய உதவவும். நகர மேலாளர்களுக்கு தெரிவிக்க கீழே உள்ள விவரங்களை உள்ளிடவும்.",
    "Issue Title": "சிக்கல் தலைப்பு",
    "Category": "வகை",
    "Location": "இருப்பிடம்",
    "Description": "விளக்கம்",
    "Submit Report": "அறிக்கையைச் சமர்ப்பிக்கவும்",
    "Missions": "பணிகள்",
    "Progress": "முன்னேற்றம்",
    "Infrastructure": "உள்கட்டமைப்பு",
    "Roads & Safety": "சாலைகள் மற்றும் பாதுகாப்பு",
    "Sanitation": "சுகாதாரம்",
    "Public Space": "பொது இடம்",
    "Community Points Earned": "சமூகப் புள்ளிகள் பெற்றுள்ளனர்",

    // Default mock data categories & values
    "Broken Streetlight": "உடைந்த தெருவிளக்கு",
    "Pothole in Right Lane": "வலது பாதையில் பள்ளம்",
    "Overflowing Dumpster": "வழிந்து ஓடும் குப்பைத் தொட்டி",
    "Damaged Guardrail": "சேதமடைந்த பாதுகாப்பு கம்பி"
  }
};

export function TranslationProvider({ children }) {
  const [lang, setLang] = useState('en');
  const [dynamicTranslations, setDynamicTranslations] = useState({});

  // Fetch active language from localStorage user settings
  const syncLanguage = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem('mock_current_user') || '{}');
      if (currentUser.preferences?.language) {
        setLang(currentUser.preferences.language);
      } else {
        setLang('en');
      }
    } catch {
      setLang('en');
    }
  };

  useEffect(() => {
    syncLanguage();
    
    // Listen to profile updates to sync language
    window.addEventListener('mock-auth-state-change', syncLanguage);
    return () => {
      window.removeEventListener('mock-auth-state-change', syncLanguage);
    };
  }, []);

  // Load cached dynamic translations from localStorage to prevent repetitive API calls
  useEffect(() => {
    try {
      const cached = localStorage.getItem('jan_sathi_translations_cache');
      if (cached) {
        setDynamicTranslations(JSON.parse(cached));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Translation function
  const t = (text) => {
    if (!text) return '';
    if (lang === 'en') return text;

    // 1. Check static dictionary
    if (STATIC_DICTIONARY[lang]?.[text]) {
      return STATIC_DICTIONARY[lang][text];
    }

    // 2. Check dynamic translation cache
    const cacheKey = `${lang}:${text}`;
    if (dynamicTranslations[cacheKey]) {
      return dynamicTranslations[cacheKey];
    }

    // 3. Trigger asynchronous LLM translation in the background if not cached
    translateTextWithGemini(text, lang).then(translated => {
      if (translated && translated !== text) {
        const updated = { ...dynamicTranslations, [cacheKey]: translated };
        setDynamicTranslations(updated);
        localStorage.setItem('jan_sathi_translations_cache', JSON.stringify(updated));
      }
    }).catch(err => {
      console.error("Translation background update failed:", err);
    });

    return text;
  };

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}
