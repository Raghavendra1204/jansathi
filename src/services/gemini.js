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
    return "Hello! I am your Jan Sathi helper. Ask me about reporting issues or finding missions.";
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
  return "I am here to help you navigate Jan Sathi! Ask me about reporting issues, joining volunteer missions, or earning community points.";
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
      systemInstruction: "You are the Jan Sathi Assistant, an AI helper for the Jan Sathi municipal portal. Your job is to help citizens and government officers navigate the platform. Citizens can report issues (roads, infrastructure, sanitation), join volunteer missions, and track their stats (XP, levels). Keep your answers helpful, friendly, and concise."
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
 * Local fallback responder for the Officer Chatbot simulation.
 */
function localMockOfficerChatResponder(history, reports) {
  if (!history || history.length === 0) return "Hello Officer.";
  const userText = history[history.length - 1].text.toLowerCase();
  
  const pendingClaims = reports.filter(r => r.status === 'Pending').length;
  const inProgressClaims = reports.filter(r => r.status === 'In Progress').length;
  const resolvedClaims = reports.filter(r => r.status === 'Resolved').length;

  if (userText.includes('priority') || userText.includes('highest')) {
    const highest = [...reports].sort((a, b) => b.priorityScore - a.priorityScore)[0];
    if (highest) {
      return `The highest priority issue currently is "${highest.title}" in ${highest.location} with a safety risk rating of ${highest.priorityScore}/100. Category: ${highest.category}.`;
    }
    return "I couldn't find any pending issues in the database right now.";
  }
  if (userText.includes('workload') || userText.includes('departments')) {
    const counts = reports.reduce((acc, r) => {
      const dept = r.assignedDepartment || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});
    return `Current workload counts: ` + Object.entries(counts).map(([d, c]) => `${d}: ${c} active issues`).join(', ') + '.';
  }
  if (userText.includes('sanitation') || userText.includes('trash') || userText.includes('garbage')) {
    const sanitationIssues = reports.filter(r => r.category === 'Sanitation' && r.status !== 'Resolved');
    return `There are currently ${sanitationIssues.length} pending sanitation issues. ` + 
      (sanitationIssues.length > 0 ? `Nearest one is at "${sanitationIssues[0].location}".` : "The sanitation queue is clear!");
  }
  if (userText.includes('summary') || userText.includes('overview')) {
    return `Jan Sathi Executive Summary: We have ${reports.length} total registered reports. ${pendingClaims} are awaiting dispatch review, ${inProgressClaims} are actively in progress, and ${resolvedClaims} have been resolved successfully. AI has predicted a high priority for Ward 17.`;
  }
  return "I can read your database in real time. Try asking: 'What is the highest priority issue?', 'Show department workloads', 'How many sanitation complaints are pending?', or 'Give me a summary report'.";
}

/**
 * Chat with Gemini model for Government Officers, feeding the active reports database as context.
 */
export async function officerChatWithGemini(history, reports) {
  if (isMockGemini || !genAI) {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
    return localMockOfficerChatResponder(history, reports);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: `You are the Jan Sathi Smart Operations Assistant for Municipal Government Officers. 
Your job is to help officers analyze incoming citizen reports, coordinate dispatches, check workloads, and summarize active city alerts.
You have real-time access to the active reports database of the city. Use the reports array provided to answer the officer's questions accurately with actual figures and details. 
Keep your answers brief, analytical, and professional.`
    });

    const reportsSummary = JSON.stringify(reports.map(r => ({
      id: r.id.substring(0, 8),
      title: r.title,
      category: r.category,
      status: r.status,
      severity: r.severity,
      priorityScore: r.priorityScore,
      location: r.location,
      assignedDepartment: r.assignedDepartment || 'Unassigned',
      date: r.date
    })));

    const contents = [
      {
        role: 'user',
        parts: [{ text: `Here is the current active municipal reports database: ${reportsSummary}` }]
      },
      ...history.map(msg => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }))
    ];

    const result = await model.generateContent({ contents });
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini Officer Chat failed. Falling back to local responder:", error);
    return localMockOfficerChatResponder(history, reports);
  }
}

/**
 * Local rule-based duplicate classifier fallback.
 */
function localMockDuplicateFinder(reports) {
  if (!reports || reports.length < 2) return [];

  const duplicateGroups = [];
  const processedIds = new Set();

  for (let i = 0; i < reports.length; i++) {
    const r1 = reports[i];
    if (processedIds.has(r1.id) || r1.status === 'Resolved') continue;

    const duplicates = [];
    const reasonsList = [];
    const matchingParams = new Set();

    for (let j = i + 1; j < reports.length; j++) {
      const r2 = reports[j];
      if (processedIds.has(r2.id) || r2.status === 'Resolved') continue;

      let isDuplicate = false;

      // 1. Check coordinates similarity
      const hasSameCoords = r1.lat && r2.lat && r1.lng && r2.lng &&
        Math.abs(r1.lat - r2.lat) < 0.005 &&
        Math.abs(r1.lng - r2.lng) < 0.005;

      // 2. Check address similarity
      const hasSameAddress = r1.location && r2.location &&
        r1.location.toLowerCase().replace(/[\d\s,]/g, '') === r2.location.toLowerCase().replace(/[\d\s,]/g, '');

      // 3. Check category similarity
      const hasSameCategory = r1.category && r2.category && r1.category === r2.category;

      // 4. Check severity similarity
      const hasSameSeverity = r1.severity && r2.severity && r1.severity === r2.severity;

      // 5. Check comments signals: >= 3 comments and contains alert keywords
      const r1Comments = r1.comments || [];
      const r2Comments = r2.comments || [];
      const allComments = [...r1Comments, ...r2Comments];
      const commentsMentioningSameIssue = allComments.filter(c => 
        /\b(same issue|already reported|duplicate|copy|repost|same problem)\b/i.test(c.text || '')
      );
      const hasCommentSignals = commentsMentioningSameIssue.length > 0 && allComments.length >= 3;

      // Duplicate Criteria:
      // Case A: Coordinates/Address matches AND Category matches
      if ((hasSameCoords || hasSameAddress) && hasSameCategory) {
        isDuplicate = true;
        matchingParams.add("Location Match");
        matchingParams.add("Category Match");
        if (hasSameSeverity) matchingParams.add("Severity Match");
      }
      // Case B: Comment signals are strong (users flagging duplicate and >=3 comments)
      else if (hasCommentSignals) {
        isDuplicate = true;
        matchingParams.add("Crowdsourced Comments");
        matchingParams.add("Category Match");
      }
      // Case C: Description similarity is extremely high
      else if (hasSameCategory && r1.description && r2.description) {
        const words1 = new Set(r1.description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const words2 = new Set(r2.description.toLowerCase().split(/\s+/).filter(w => w.length > 3));
        const intersection = [...words1].filter(w => words2.has(w));
        if (intersection.length >= 3) {
          isDuplicate = true;
          matchingParams.add("Description Overlap");
          matchingParams.add("Department Keywords");
        }
      }

      if (isDuplicate) {
        duplicates.push(r2);
        processedIds.add(r2.id);
        
        // Build reasons list
        if (hasSameCoords || hasSameAddress) {
          reasonsList.push(`located at the same address/coordinates area (${r1.location})`);
        }
        if (hasSameCategory) {
          reasonsList.push(`classified under the same category (${r1.category})`);
        }
        if (hasCommentSignals) {
          reasonsList.push(`flagged as a duplicate by citizen comments`);
        }
        if (matchingParams.has("Description Overlap")) {
          reasonsList.push("describing identical infrastructure failure descriptors");
        }
      }
    }

    if (duplicates.length > 0) {
      duplicates.unshift(r1); // Add main report
      processedIds.add(r1.id);

      duplicateGroups.push({
        duplicateGroupId: `dup-group-${r1.id}`,
        issueTitle: r1.title,
        reportIds: duplicates.map(d => d.id),
        matchingParameters: Array.from(matchingParams),
        reason: `These reports match because they are ${reasonsList.length > 0 ? reasonsList.join(" and ") : "reporting the same civic issue at this location"}.`
      });
    }
  }

  return duplicateGroups;
}

/**
 * Live Gemini analyzer to group duplicate municipal tickets.
 */
export async function findDuplicateReportsWithGemini(reports) {
  if (isMockGemini || !genAI) {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
    return localMockDuplicateFinder(reports);
  }

  try {
    const prompt = `You are the Jan Sathi Duplicate Classifier Agent. Your task is to analyze the active municipal issues database and cluster reports that represent the exact same physical issue (duplicates).
    
For each duplicate group found, provide:
1. A descriptive title for the issue.
2. The list of report IDs that are duplicates.
3. The matching parameters (e.g. "Location Match", "Category Match", "Crowdsourced Comments", "Description Overlap", "Severity Match", "Department Keywords").
4. A clear reasoning explanation detailing why these reports are duplicates.

Here is the JSON list of active reports:
${JSON.stringify(reports.map(r => ({
  id: r.id,
  title: r.title,
  description: r.description,
  category: r.category,
  severity: r.severity,
  location: r.location,
  coordinates: r.lat && r.lng ? { lat: r.lat, lng: r.lng } : null,
  comments: (r.comments || []).map(c => c.text)
})))}

Respond with ONLY a clean JSON array of duplicate groups. Each group must be an object with the keys:
- "duplicateGroupId": string
- "issueTitle": string
- "reportIds": string[] (array of report IDs that are duplicates)
- "matchingParameters": string[]
- "reason": string

If no duplicate reports are found, return an empty JSON array []. Do not include markdown code block formatting (like \`\`\`json) or any other text.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Duplicate Classifier failed. Falling back to offline matcher:", error);
    return localMockDuplicateFinder(reports);
  }
}

/**
 * Local offline rule-based scoring fallback for the predictive risk analyzer.
 */
function localMockRiskAnalyzer(reports) {
  if (!reports || reports.length === 0) return [];

  // 1. Group unresolved reports by department to calculate backlog weights
  const deptBacklog = reports.reduce((acc, r) => {
    if (r.status !== 'Resolved') {
      const dept = r.assignedDepartment || 'Unassigned';
      acc[dept] = (acc[dept] || 0) + 1;
    }
    return acc;
  }, {});

  // 2. Count reports by date to calculate trend delta
  const reportsByDate = reports.reduce((acc, r) => {
    const d = r.date || '2026-06-29';
    acc[d] = (acc[d] || 0) + 1;
    return acc;
  }, {});

  const today = '2026-06-29';
  const yesterday = '2026-06-28';
  const todayCount = reportsByDate[today] || 0;
  const yesterdayCount = reportsByDate[yesterday] || 0;
  const isTrendIncreasing = todayCount > yesterdayCount;

  return reports.map(r => {
    let riskScore = 20; // baseline
    const factors = [];
    let predictedScenario = "Ongoing localized municipal service interruption.";
    let preventiveAction = "Schedule routine department maintenance checks.";

    const text = `${r.title} ${r.description} ${r.location}`.toLowerCase();

    // factor A: Proximity to Critical Infrastructure
    const hasCriticalInfra = /\b(hospital|school|metro|highway|airport|govt|fire|police|electric|power|grid|water plant)\b/i.test(text);
    if (hasCriticalInfra) {
      riskScore += 25;
      factors.push("Critical Infrastructure Proximity");
    }

    // factor B: Incident Density (similar category nearby < 0.01 degrees ~ 1km)
    const similarNearby = reports.filter(other => 
      other.id !== r.id &&
      other.category === r.category &&
      other.lat && r.lat &&
      Math.abs(other.lat - r.lat) < 0.015 &&
      Math.abs(other.lng - r.lng) < 0.015
    );
    if (similarNearby.length > 0) {
      riskScore += 15;
      factors.push("High Incident Density");
    }

    // factor C: Department Backlog Weight
    const dept = r.assignedDepartment || 'Unassigned';
    const backlogCount = deptBacklog[dept] || 0;
    if (backlogCount > 2) {
      riskScore += 15;
      factors.push("Department Backlog Escalation");
    }

    // factor D: Traffic Importance (Transit routes)
    const isTrafficHazard = /\b(highway|main road|avenue|crossing|traffic|swerve|gridlock|jam)\b/i.test(text);
    if (isTrafficHazard) {
      riskScore += 15;
      factors.push("Transit Traffic Danger");
    }

    // factor E: SLA timer breach (> 1 day old unresolved)
    const uploadDate = new Date(r.date || today);
    const todayDate = new Date(today);
    const diffDays = Math.floor((todayDate - uploadDate) / (1000 * 60 * 60 * 24));
    if (diffDays >= 1) {
      riskScore += 10;
      factors.push("SLA Timer Breach");
    }

    // factor F: Trend analysis velocity
    if (isTrendIncreasing) {
      riskScore += 10;
      factors.push("Accelerating Report Velocity");
    }

    // factor G: Community Verification / Upvotes
    const upvotesCount = r.pointsEarned || 0;
    if (upvotesCount > 20) {
      riskScore += 10;
      factors.push("High Community Verification");
    }

    // Cap score at 98
    riskScore = Math.min(riskScore, 98);

    // Customize predictions based on category
    if (r.category === 'Sanitation') {
      predictedScenario = "Uncontrolled sewage blockages will lead to public health hazards and drinking water contamination.";
      preventiveAction = "Clear municipal drain grates, pump out sludge, and sanitize surrounding residential pathways.";
    } else if (r.category === 'Roads & Safety') {
      predictedScenario = "Multiple vehicle collision risks and severe traffic gridlocks on transit highways.";
      preventiveAction = "Place illuminated warning barriers immediately and dispatch road patch repair teams.";
    } else if (r.category === 'Infrastructure') {
      predictedScenario = "Systemic utility collapse causing power blackouts or water delivery pipeline disruptions.";
      preventiveAction = "Deploy heavy service engineering vehicles to patch primary distribution mains.";
    }

    return {
      reportId: r.id,
      riskScore,
      triggeredFactors: factors.length > 0 ? factors : ["Routine Priority"],
      predictedScenario,
      preventiveAction,
      reasoning: `Score of ${riskScore}/100 computed based on triggers: ${factors.join(", ") || "standard priority markers"}.`
    };
  });
}

/**
 * Live Gemini analyzer to calculate risk scores and forecast municipal hazards.
 */
export async function analyzePredictiveRisksWithGemini(reports) {
  if (isMockGemini || !genAI) {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
    return localMockRiskAnalyzer(reports);
  }

  try {
    const prompt = `You are the Jan Sathi Predictive Risk Analyzer Agent. Your task is to calculate a Risk Score (1-100) and forecast municipal hazards for active reports based on:
1. Incident Density: Cluster of similar nearby issues.
2. Time Pattern: Escalation (today vs previous days).
3. Infrastructure Proximity: Proximity to hospitals, schools, metro stations, highways, airports, power plants, etc.
4. Historical backlog: Escalated value if assigned department has unresolved old reports.
5. Traffic Importance: Impacts main transit roads.
6. Environmental factors.

Respond with ONLY a clean JSON array of risk assessments. Each assessment object must have:
- "reportId": string
- "riskScore": number (1-100)
- "triggeredFactors": string[]
- "predictedScenario": string (what is likely to happen next)
- "preventiveAction": string (what the government should do before it becomes a major problem)
- "reasoning": string

Here is the JSON list of active reports:
${JSON.stringify(reports.map(r => ({
  id: r.id,
  title: r.title,
  description: r.description,
  category: r.category,
  severity: r.severity,
  location: r.location,
  coordinates: r.lat && r.lng ? { lat: r.lat, lng: r.lng } : null,
  date: r.date,
  commentsCount: (r.comments || []).length,
  assignedDepartment: r.assignedDepartment || 'Unassigned'
})))}

Respond with ONLY clean JSON array. Do not include markdown code block formatting (like \`\`\`json) or any other text.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Risk Analyzer failed. Falling back to local offline matcher:", error);
    return localMockRiskAnalyzer(reports);
  }
}

/**
 * Local offline rule-based scoring fallback for the resource planner.
 */
function localMockResourcePlanner(report) {
  const isCritical = report.severity === 'Critical' || (report.priorityScore && report.priorityScore >= 75);

  let department = "Civic Works Administration";
  let teamName = "Squad Alpha - Operations";
  let personnelCount = 5;
  let equipment = "Standard repair kits, utility vehicles";
  let estimatedResolutionTime = 12;
  let estimatedCost = 35000;
  let priority = report.severity || "Medium";
  let suggestedStartTime = "09:00 AM";
  let expectedCompletionTime = "09:00 PM";
  let confidenceScore = 90;
  let reasoning = `Standard operational workflow dispatch recommended for category "${report.category}".`;
  let emergencyActions = [];

  if (isCritical) {
    department = "Emergency Services & Disaster Management";
    teamName = "Rapid Tactical Unit 7";
    personnelCount = 10;
    equipment = "Disaster rescue gear, emergency response vehicle, heavy earthmovers";
    estimatedResolutionTime = 4;
    estimatedCost = 180000;
    priority = "Critical";
    suggestedStartTime = "Immediate";
    expectedCompletionTime = "4 Hours from dispatch";
    confidenceScore = 95;
    reasoning = `Incident classified as Critical severity or high threat density. Immediate disaster response team dispatch required.`;
    emergencyActions = [
      "Evacuate adjacent structures and set up safety parameter lines.",
      "Dispatch immediate emergency response vehicles and medical support teams.",
      "Notify Ward 17 municipal engineers and divert nearby road traffic."
    ];
  } else if (report.category === 'Roads & Safety') {
    department = "Roads & Bridges Department";
    teamName = "Squad A - Paving Specialists";
    personnelCount = 8;
    equipment = "1 Asphalt roller, 1 heavy excavator, barricades";
    estimatedResolutionTime = 8;
    estimatedCost = 235000;
    reasoning = "Road asphalt failure requires excavation, subbase leveling, and hot asphalt paving.";
  } else if (report.category === 'Sanitation') {
    department = "Sanitation & Water Board";
    teamName = "Squad C - Sewer Clearing Crew";
    personnelCount = 4;
    equipment = "1 high-pressure vacuum jetting truck, protective suits";
    estimatedResolutionTime = 6;
    estimatedCost = 15000;
    reasoning = "Sewer clog requires high-pressure utility line jetting to clear blockages.";
  } else if (report.category === 'Infrastructure') {
    department = "Municipal Electricity & Utility Board";
    teamName = "Squad D - Power Grid Linemen";
    personnelCount = 3;
    equipment = "1 bucket truck, diagnostic electrical rigging tools";
    estimatedResolutionTime = 10;
    estimatedCost = 45000;
    reasoning = "Infrastructure damage requires structural reinforcement and grid connector testing.";
  }

  return {
    department,
    teamName,
    personnelCount,
    equipment,
    estimatedResolutionTime,
    estimatedCost,
    priority,
    suggestedStartTime,
    expectedCompletionTime,
    confidenceScore,
    reasoning,
    ...(isCritical ? { emergencyActions } : {})
  };
}

/**
 * Live Gemini planner to generate resource allocation recommendations.
 */
export async function generateResourcePlanWithGemini(report) {
  if (isMockGemini || !genAI) {
    await new Promise(resolve => setTimeout(resolve, 800)); // simulate latency
    return localMockResourcePlanner(report);
  }

  try {
    const isCritical = report.severity === 'Critical' || (report.priorityScore && report.priorityScore >= 75);
    const prompt = `You are the Jan Sathi Resource Planner Agent. Your job is to automatically recommend the optimal resources required to resolve a municipal incident.
    
Here are the incident details:
- Title: ${report.title}
- Description: ${report.description}
- Category: ${report.category}
- Severity: ${report.severity}
- Location: ${report.location}
- Priority Score: ${report.priorityScore || 40}

Respond with ONLY a clean JSON object containing the recommended plan. The object must contain the following keys:
- "department": string (e.g. "Road Department", "Sewage Board")
- "teamName": string (e.g. "Squad A - Maintenance")
- "personnelCount": number (number of crew members)
- "equipment": string (equipment/vehicles needed)
- "estimatedResolutionTime": number (in hours)
- "estimatedCost": number (in Rupees)
- "priority": string (e.g. "Low", "Medium", "High", "Critical")
- "suggestedStartTime": string (e.g. "08:00 AM")
- "expectedCompletionTime": string (e.g. "04:00 PM")
- "confidenceScore": number (1-100)
- "reasoning": string (concise logic)
${isCritical ? `
Since this incident is classified as Critical, this must be an Emergency Response Plan. Include emergency response allocations and immediate recommended actions in key "emergencyActions" (array of strings).` : ''}

Respond with ONLY a clean JSON object. Do not include markdown code block formatting (like \`\`\`json) or any other text.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Resource Planner failed. Falling back to local matcher:", error);
    return localMockResourcePlanner(report);
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

/**
 * Local rule-based keyword fallback moderation.
 */
export function localMockModeration(text) {
  const lower = (text || '').toLowerCase();
  const badWords = ['abuse', 'spam', 'scam', 'kill', 'fake', 'explicit', 'stupid', 'idiot', 'crap', 'garbage', 'f***', 'sh**', 'bastard'];
  const foundBad = badWords.filter(word => lower.includes(word));
  
  const isExplicit = foundBad.length > 0;
  let flags = [];
  if (isExplicit) {
    if (lower.includes('spam') || lower.includes('scam')) flags.push('Spam / Scam');
    if (lower.includes('fake')) flags.push('Fake Report Warning');
    if (foundBad.some(w => ['abuse', 'stupid', 'idiot', 'crap', 'garbage', 'bastard'].includes(w))) flags.push('Abusive Language');
    if (lower.includes('kill')) flags.push('Harassment / Threat');
    if (flags.length === 0) flags.push('Explicit Language');
  }

  let sentiment = 'Neutral';
  if (isExplicit) {
    sentiment = 'Negative';
  } else if (lower.includes('good') || lower.includes('great') || lower.includes('thank') || lower.includes('awesome') || lower.includes('happy') || lower.includes('solved') || lower.includes('resolved')) {
    sentiment = 'Positive';
  }

  return {
    sentiment,
    isExplicit,
    flags,
    confidence: isExplicit ? 95 : 88,
    reasoning: isExplicit ? `Detected flagged keywords: ${foundBad.join(', ')}` : "No explicit keywords or spam indicators found in text analysis."
  };
}

/**
 * AI Content Moderation service for Agent 7 & 8 using Gemini.
 */
export async function analyzeModerationWithGemini(text) {
  if (isMockGemini || !genAI) {
    return localMockModeration(text);
  }
  try {
    const prompt = `You are Jan Sathi Content Moderation Agent (Agent 7 & 8).
Your task is to analyze the following user post or comment for citizen sentiment and spam/explicit language.
Analyze if it contains spam, scams, explicit or abusive language, bad words, threats, or harassment.

Text to analyze: "${text}"

Respond with ONLY a clean JSON object containing the following keys:
- "sentiment": string ("Positive", "Neutral", "Negative")
- "isExplicit": boolean (true if explicit, spam, scam, abusive, bad language, or threat)
- "flags": array of strings (e.g. ["Abusive Language", "Spam", "Threat"] or empty array if safe)
- "confidence": number (1-100)
- "reasoning": string (very brief explanation)

Do not include markdown code block formatting (like \`\`\`json) or any other text.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Content Moderation failed, using fallback:", error);
    return localMockModeration(text);
  }
}

/**
 * Local offline rule-based report content generator fallback.
 */
export function localMockReportText(reportType, reportData, filters) {
  let executiveSummary = `This executive operations summary analyzes municipal data for the "${reportType}" period. Initial telemetry indicates normal caseloads, with municipal services actively responding to public demands. Resource deployments show active teams coordinating across primary districts, with minor queue density in utility works.`;
  
  let aiInsights = `Case metrics show varying resolution speed across departments. Infrastructure and Roads & Safety comprise the largest ticket share, followed by Sanitation. Resource costs aggregate under approved schedules, maintaining standard budget bounds. Department performance indicators suggest a 4.2% efficiency optimization opportunity through strategic task-merging.`;

  let aiRecommendations = [
    "Deploy additional drainage and utility maintenance teams to high-volume zones.",
    "Escalate unresolved citizen complaints exceeding standard SLA timers.",
    "Optimize vehicle dispatches by grouping proximate tasks within active wards.",
    "Allocate preventive maintenance budget reserves for upcoming utility clearing cycles.",
    "Coordinate joint operations between Water Board and Roads department on overlapping pipelines."
  ];

  let conclusion = `In conclusion, targeted staff reallocations and proactive asset inspections in high-priority zones will sustain city operational efficiency.`;

  // Custom responses based on reportType
  if (reportType.includes("Smart City Health")) {
    executiveSummary = "The Smart City Health Assessment indicates a stable municipal health index, with strong scores in sanitation and community participation offset by infrastructure maintenance bottlenecks.";
    aiInsights = "Roads & Safety and Utility grids experience the highest delays. Sanitation and Environment divisions hold strong marks, driving the overall city health index positively.";
    aiRecommendations = [
      "Target localized paving dispatches to critical roadway corridors.",
      "Initiate smart sensor deployments for sewer overflow warning alerts.",
      "Accelerate streetlight panel upgrades in high-traffic wards.",
      "Optimize sanitation dispatch logs to resolve dumpster overflow points.",
      "Conduct emergency response readiness drills with ward engineers."
    ];
  } else if (reportType.includes("Budget & Cost")) {
    executiveSummary = "This budget and expenditure summary assesses incident resolution costs, team resource costs, and emergency dispatches.";
    aiInsights = "Emergency repairs for high-severity cases account for 42% of total operational expenditure. Standard paving and cleaning dispatches remain cost-effective.";
    aiRecommendations = [
      "Perform preventive maintenance on electrical grids to avoid high emergency costs.",
      "Transition minor utility tasks to local volunteer forces to save labor costs.",
      "Consolidate multiple equipment rentals into centralized department leases.",
      "Introduce cost-matching algorithms to optimize private vendor selections.",
      "Implement a strict cost-approval threshold for non-critical dispatches."
    ];
  } else if (reportType.includes("Predictive Risk")) {
    executiveSummary = "Predictive Risk AI flags elevation of risk levels in infrastructure and safety sectors, mapping potential incident clusters.";
    aiInsights = "Historical reports, upvote speed, and weather parameters point to an elevated probability of pipe bursts and streetlight failures in Ward 12.";
    aiRecommendations = [
      "Redirect municipal water engineers to conduct pipeline thickness tests.",
      "Deploy warning sensors to high-probability structural stress points.",
      "Pre-position power grid replacement units near predicted outage zones.",
      "Notify local police divisions of elevated traffic hazard spots.",
      "Increase public awareness briefings on regional storm predictions."
    ];
  } else if (reportType.includes("Community Engagement")) {
    executiveSummary = "The Community Engagement Report reviews citizen activity, volunteer mission enrollments, and citizen reputation metrics.";
    aiInsights = "Active citizen participation has risen by 15%, driven by active campaigns and competitive reputation leaderboards.";
    aiRecommendations = [
      "Introduce special badge incentives for top local contributors.",
      "Establish partnership portals with local NGOs for weekly cleanups.",
      "Automate reward verification for completed citizen missions.",
      "Increase high-XP campaigns in under-represented neighborhoods.",
      "Publish leaderboard standouts on the public dashboard feed."
    ];
  }

  return {
    executiveSummary,
    aiInsights,
    aiRecommendations,
    conclusion
  };
}

/**
 * AI Executive Report Generator for Agent 9 using Gemini.
 */
export async function generateExecutiveReportWithGemini(reportType, reportData, filters) {
  if (isMockGemini || !genAI) {
    return localMockReportText(reportType, reportData, filters);
  }
  try {
    const prompt = `You are the Jan Sathi Executive Report Generator Agent (Agent 9).
Your job is to write a highly professional, government-grade executive report analysis based on real-time municipal data.

Report Type: ${reportType}
Report Period / Filters: ${JSON.stringify(filters)}
Compiled Telemetry Data: ${JSON.stringify(reportData)}

Your output must be a clean, structured JSON object with the following keys:
- "executiveSummary": string (a comprehensive 1-2 paragraph briefing summarizing current status, major updates, or concerns)
- "aiInsights": string (detailed analytical observations and trends about department workloads, budget spending, or infrastructure health)
- "aiRecommendations": array of exactly 5 strings (a list of "Top 5 Recommended Actions" that are highly actionable, specific, and directly relevant to the data and report type)
- "conclusion": string (final remarks and a sign-off summary for municipal commissioners/officers)

Make sure the writing style is formal, clear, authoritative, and reads like an official government briefing.
Do not include markdown code block formatting (like \`\`\`json) or any other text. Respond with ONLY the raw JSON object.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const jsonText = response.text().trim().replace(/^```json\s*|```$/g, '');
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Executive Report failed, using local offline fallback:", error);
    return localMockReportText(reportType, reportData, filters);
  }
}

export async function generateAIInsightsWithGemini(reportsData) {
  try {
    if (!genAI) {
      throw new Error("Gemini API not configured");
    }

    const summaryText = reportsData.map(r => `- [${r.severity}] ${r.title} in ${r.location} (Status: ${r.status}, Dept: ${r.assignedDepartment})`).join('\n');

    const prompt = `You are the Jan Sathi AI City Intelligence Agent. Below is a list of active municipal complaints reported by citizens in Bengaluru:
${summaryText}

Please write a comprehensive, professional, and actionable city intelligence briefing for the municipal officer. Your response must include:
1. **Executive Operations Brief**: A concise summary of the overall status of the city operations and incident queues.
2. **Division Performance Overview**: Highlight any departments with high workloads or delayed SLAs.
3. **Regional Risk Analysis**: Identify any wards/regions facing high density of hazards (critical sewers, dark streets, etc.).
4. **Top 3 Recommended Actions**: Actionable, high-impact tasks the officer should execute next.

Format your output in clean, professional markdown. Make sure the tone is formal, executive, and analytical.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini AI Insights failed, using local fallback summary:", error);
    
    const total = reportsData.length;
    const critical = reportsData.filter(r => r.severity === 'Critical').length;
    const pending = reportsData.filter(r => r.status === 'Pending' || r.status === 'Submitted').length;
    const roads = reportsData.filter(r => (r.assignedDepartment || '').toLowerCase().includes('road')).length;
    const water = reportsData.filter(r => (r.assignedDepartment || '').toLowerCase().includes('water')).length;

    return `### 🤖 Jan Sathi AI City Intelligence Briefing (Offline Mode)

#### 1. Executive Operations Brief
The municipal incident queue currently houses **${total} active reports**, with **${pending} tickets** pending dispatcher dispatch or resource approval. **${critical} critical severity events** require immediate tactical intervention to prevent community safety hazards.

#### 2. Division Performance Overview
- **Roads & Bridges**: Holds **${roads} active incidents**. Overlaps detected near Broadway Avenue.
- **Water Board**: Managing **${water} leakage reports**. High pressure lines on Broadway require SLA acceleration.

#### 3. Regional Risk Analysis
- **Ward 17 (Indiranagar)**: Shows density cluster of sanitation and streetlight reports.
- **Broadway Ave**: Dual sewage and water leakage points indicate regional utility network fatigue.

#### 4. Top 3 Recommended Actions
1. **Merge Duplicates**: Auto-merge Broadway water leakage tickets to release 12 dispatch hours.
2. **Deploy Alpha Crew**: Dispatch Roads Team Alpha to Indiranagar sanitation cluster.
3. **Escalate Criticals**: Review critical gas leak claims to meet the 18-hour SLA threshold.`;
  }
}


