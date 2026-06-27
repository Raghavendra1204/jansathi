import { GoogleGenerativeAI } from '@google/generative-ai';

const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
const isMockGemini = !geminiApiKey || geminiApiKey.includes('YOUR_GEMINI_API_KEY') || geminiApiKey.trim() === '';

// Initialize Gemini Client
let genAI = null;
if (!isMockGemini) {
  try {
    genAI = new GoogleGenerativeAI(geminiApiKey);
    console.log("Gemini SDK client initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize GoogleGenerativeAI client:", error);
  }
}

/**
 * Local fallback classifier to simulate AI behavior when no key is set.
 */
function localMockClassifier(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  // 1. Determine Category
  let category = 'Other';
  if (/\b(road|highway|pothole|street|guardrail|traffic|car|vehicle|crash|swerve)\b/.test(text)) {
    category = 'Roads & Safety';
  } else if (/\b(garbage|trash|dumpster|sanitation|waste|smell|litter|odor|dumping)\b/.test(text)) {
    category = 'Sanitation';
  } else if (/\b(water|pipe|leak|streetlight|light|power|wire|bridge|crack|utility)\b/.test(text)) {
    category = 'Infrastructure';
  } else if (/\b(park|wall|graffiti|spray|bench|playground|trail|public)\b/.test(text)) {
    category = 'Public Space';
  }

  // 2. Determine Severity and Priority Score
  let severity = 'Low';
  let priorityScore = 20;

  if (/\b(danger|hazard|hazard|critical|exposed|crash|fire|hurt|injury|swerved|accident)\b/.test(text)) {
    severity = 'Critical';
    priorityScore = 90;
  } else if (/\b(leak|damaged|broken|unsafe|risk|deep|severe)\b/.test(text)) {
    severity = 'High';
    priorityScore = 75;
  } else if (/\b(overflowing|blockage|odor|graffiti|spray)\b/.test(text)) {
    severity = 'Medium';
    priorityScore = 45;
  }

  // 3. Formulate Summary
  const summary = `Mock AI assessment: Identified ${category} issue with ${severity.toLowerCase()} severity.`;

  return { category, severity, priorityScore, summary };
}

/**
 * Local fallback responder for the Chatbot simulation.
 * @param {Array} history 
 */
function localMockChatResponder(history) {
  if (!history || history.length === 0) {
    return "Hello! I am your Jaan Sathi helper. Ask me about reporting issues or finding missions.";
  }
  
  const lastUserMessage = history[history.length - 1].text.toLowerCase();
  
  if (lastUserMessage.includes('report') || lastUserMessage.includes('issue')) {
    return "To report a civic issue, click 'Report an Issue' in your sidebar. You can upload a photo, describe the problem, and use the GPS locator. Gemini will automatically categorize and sort it!";
  }
  if (lastUserMessage.includes('points') || lastUserMessage.includes('xp') || lastUserMessage.includes('level')) {
    return "You earn Community Points and XP by reporting civic issues and completing volunteering missions. Once verified by an officer, your points will update immediately on your dashboard!";
  }
  if (lastUserMessage.includes('mission') || lastUserMessage.includes('volunteer') || lastUserMessage.includes('explore')) {
    return "Go to 'Explore Missions' in the sidebar to browse volunteer campaigns. Click 'Join Mission' to register and help out!";
  }
  if (lastUserMessage.includes('officer') || lastUserMessage.includes('approve') || lastUserMessage.includes('dashboard')) {
    return "Government Officers can access the 'Officer Dashboard' to verify citizen claims and disburse community points.";
  }
  return "I am here to help you navigate Jaan Sathi! Ask me about reporting issues, joining volunteer missions, or earning community points.";
}

/**
 * Automatically categorizes and prioritizes a municipal issue based on its description.
 * @param {string} title 
 * @param {string} description 
 */
export async function analyzeReport(title, description) {
  if (isMockGemini || !genAI) {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
    return localMockClassifier(title, description);
  }

  try {
    const prompt = `Analyze the following municipal issue report and determine the category, severity level, priority score, and a short summary.

Title: "${title}"
Description: "${description}"

Choose from:
- category: "Infrastructure" | "Roads & Safety" | "Sanitation" | "Public Space" | "Other"
- severity: "Low" | "Medium" | "High" | "Critical"
- priorityScore: A number between 1 and 100 reflecting safety risk (higher means more dangerous, e.g., pothole causing swerves is High/75, leaking fire hydrant is Critical/90, graffiti is Low/20).
- summary: A single-sentence summary of the hazard.

Respond with ONLY a clean JSON object containing keys: "category", "severity", "priorityScore", and "summary". Do not include markdown code block formatting (like \`\`\`json) or any other text.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const cleanJsonText = response.text().trim();
    
    return JSON.parse(cleanJsonText);
  } catch (error) {
    console.error("Gemini classification failed. Falling back to local classifier:", error);
    return localMockClassifier(title, description);
  }
}

/**
 * Chat with Gemini model keeping conversational history context.
 * @param {Array} history - Array of { role: 'user'|'model', text: '...' }
 */
export async function chatWithGemini(history) {
  if (isMockGemini || !genAI) {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
    return localMockChatResponder(history);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: "You are the Jaan Sathi Assistant, an AI helper for the Jaan Sathi municipal portal. Your job is to help citizens and government officers navigate the platform. Citizens can report issues (roads, infrastructure, sanitation), join volunteer missions, and track their stats (XP, levels). Keep your answers helpful, friendly, and concise."
    });

    // Format chat history for Gemini API
    const contents = history.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    }));

    const result = await model.generateContent({ contents });
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Chat failed. Falling back to local responder:", error);
    // Dynamic fallback to the local responder to prevent UX breaking
    return localMockChatResponder(history);
  }
}

/**
 * Translates a given text string into the target language using Gemini.
 */
export async function translateTextWithGemini(text, targetLang) {
  if (isMockGemini || !genAI) {
    // Local static translator fallbacks will handle this offline
    return text;
  }

  try {
    const langMap = {
      hi: 'Hindi',
      te: 'Telugu',
      kn: 'Kannada',
      ta: 'Tamil',
      en: 'English'
    };
    const langName = langMap[targetLang] || targetLang;
    const prompt = `Translate the following text into ${langName}. Return ONLY the translated text. Do not add comments, quotes, or markdown format:
    
    "${text}"`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini translation failed:", error);
    return text;
  }
}
