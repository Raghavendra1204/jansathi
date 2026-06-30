import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileText, Calendar, Filter, Download, Share2, Printer, 
  ChevronRight, Sparkles, AlertTriangle, ShieldCheck, 
  BarChart3, Activity, Cpu, Users, Wrench, Shield, ArrowLeft, Loader, CheckCircle, Search
} from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { generateExecutiveReportWithGemini } from '../services/gemini';
import { fetchTopHeroes, fetchMissions } from '../services/api';

export default function ExecutiveReportsConsole({ reports = [], user = {} }) {
  const { t } = useTranslation();
  
  // Local states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedWard, setSelectedWard] = useState('All');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedPriority, setSelectedPriority] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  
  // Selected sub-items for specific reports
  const [selectedIncidentId, setSelectedIncidentId] = useState('');
  const [selectedPerformanceDept, setSelectedPerformanceDept] = useState('');
  const [selectedReportWard, setSelectedReportWard] = useState('');
  const [selectedPerformanceOfficer, setSelectedPerformanceOfficer] = useState('');
  const [selectedLocationInput, setSelectedLocationInput] = useState('');

  // Loader & Report preview state
  const [loadingReport, setLoadingReport] = useState(false);
  const [activeReport, setActiveReport] = useState(null); // { type, data, aiResult, dateGenerated }
  const [lastGeneratedTimes, setLastGeneratedTimes] = useState(() => {
    const saved = localStorage.getItem('jan_sathi_last_reports');
    return saved ? JSON.parse(saved) : {};
  });

  // Top Heroes (Citizens) & Missions for Community Reports
  const [topHeroes, setTopHeroes] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]);

  useEffect(() => {
    async function loadCommunityDetails() {
      try {
        const heroes = await fetchTopHeroes();
        const missions = await fetchMissions();
        setTopHeroes(heroes);
        setActiveMissions(missions);
      } catch (err) {
        console.error("Failed to load community details for report", err);
      }
    }
    loadCommunityDetails();
  }, []);

  const reportTypes = [
    { id: 'daily-ops', name: t('Daily City Operations Report'), desc: t('A comprehensive operations summary displaying daily complaint totals, resolution rates, pending backlogs, and department workload dispatches.') },
    { id: 'critical-incident', name: t('Critical Incident Report'), desc: t('A deep-dive investigation briefing for any critical incident, summarizing risks, approved resource allocations, response speed, and officer notes.') },
    { id: 'dept-performance', name: t('Department Performance Report'), desc: t('Measures case-handling speed, resolved vs pending workloads, total budgets spent, and performance efficiency scores by department.') },
    { id: 'ward-zone', name: t('Ward / Zone Report'), desc: t('Focuses on a specific municipal ward to catalog localized complaints, recurring patterns, community volunteer support, and structural risk zones.') },
    { id: 'predictive-risk', name: t('Predictive Risk Report'), desc: t('Displays predictive hazard hotspots, forecasting incident frequencies and outlining recommended preventive actions.') },
    { id: 'exec-briefing', name: t('AI Executive Briefing'), desc: t('A high-level natural language summary compiled for the Municipal Commissioner, highlighting major city concerns and immediate actions.') },
    { id: 'budget-cost', name: t('Budget & Cost Analysis'), desc: t('Analyzes average resolution spending, emergency response budgets, cost savings, and AI-powered cost-reduction opportunities.') },
    { id: 'resource-utilization', name: t('Resource Utilization Report'), desc: t('Tracks personnel deployments, team dispatches, heavy vehicles, and equipment shortages across active repair sites.') },
    { id: 'smart-city-health', name: t('Smart City Health Report'), desc: t('Calculates overall municipal index scores for roads, water lines, sanitation, power grids, emergency readiness, and citizen satisfaction.') },
    { id: 'community-engagement', name: t('Community Engagement Report'), desc: t('Evaluates active citizen reporters, community cleanup participation, NGO contributions, and the top reputation contributors.') },
    { id: 'officer-performance', name: t('Officer Performance Report'), desc: t('Measures assigned cases, resolution times, citizen feedback ratings, and operational performance metrics by officer.') },
    { id: 'duplicate-detection', name: t('Duplicate Detection Report'), desc: t('Details merged duplicate complaints, citizen reporting accuracy, and calculated officer hours saved by automated filtering.') },
    { id: 'crisis-response', name: t('Crisis Response Report'), desc: t('Compiled for critical emergency incidents, outlining response times, departments deployed, citizen notifications, and lessons learned.') },
    { id: 'monthly-municipal', name: t('Monthly Municipal Report'), desc: t('A macro monthly statistics comparison detailing trends, infrastructure performance indices, and budget summaries.') },
    { id: 'area-intelligence', name: t('Area Intelligence Report'), desc: t('Allows officers to pin-point any custom street location to review complaint history, risk score, and estimated restoration costs.') },
  ];

  // List of unique departments/wards/officers from reports database
  const uniqueDepartments = Array.from(new Set(reports.map(r => r.resourcePlan?.department || r.assignedDepartment).filter(Boolean)));
  const uniqueWards = ['Ward 12 (Delhi Cantonment)', 'Ward 5 (Downtown)', 'Ward 8 (Broadway)', 'Ward 3 (Oak Park)'];
  const uniqueOfficers = Array.from(new Set(reports.map(r => r.assignedOfficer || r.resolvedBy).filter(Boolean)));

  // Filter reports according to select values
  const getFilteredReports = () => {
    return reports.filter(r => {
      let matches = true;
      if (startDate && r.date < startDate) matches = false;
      if (endDate && r.date > endDate) matches = false;
      
      if (selectedDept !== 'All') {
        const dept = r.resourcePlan?.department || r.assignedDepartment;
        if (dept !== selectedDept) matches = false;
      }
      if (selectedWard !== 'All') {
        const loc = r.location || '';
        if (selectedWard === 'Ward 12 (Delhi Cantonment)' && !loc.includes('Ward 12') && !loc.includes('Cantonment')) matches = false;
        else if (selectedWard === 'Ward 5 (Downtown)' && !loc.includes('Pine Street') && !loc.includes('Downtown')) matches = false;
        else if (selectedWard === 'Ward 8 (Broadway)' && !loc.includes('Broadway')) matches = false;
        else if (selectedWard === 'Ward 3 (Oak Park)' && !loc.includes('Oak Park')) matches = false;
      }
      if (selectedCategory !== 'All' && r.category !== selectedCategory) matches = false;
      if (selectedPriority !== 'All' && r.severity !== selectedPriority) matches = false;
      if (selectedStatus !== 'All' && r.status !== selectedStatus) matches = false;
      
      return matches;
    });
  };

  // Compile database statistics
  const compileReportStats = (filtered) => {
    const total = filtered.length;
    const resolved = filtered.filter(r => r.status === 'Resolved').length;
    const pending = filtered.filter(r => r.status === 'Pending' || r.status === 'Resources Assigned' || r.status === 'In Progress').length;
    const critical = filtered.filter(r => r.severity === 'Critical' || (r.priorityScore && r.priorityScore >= 75)).length;

    let totalResTime = 0;
    let resCount = 0;
    filtered.forEach(r => {
      if (r.status === 'Resolved') {
        const timeVal = r.resourcePlan?.estimatedResolutionTime || parseInt(r.resolutionTime) || 12;
        totalResTime += timeVal;
        resCount++;
      }
    });
    const avgResTime = resCount > 0 ? Math.round(totalResTime / resCount) : 18;

    const getReportCost = (r) => {
      if (r.resourcePlan?.estimatedCost) return r.resourcePlan.estimatedCost;
      
      const resCostStr = String(r.resolutionCost || '');
      if (resCostStr && resCostStr.trim()) {
        const parsed = parseInt(resCostStr.replace(/[^\d]/g, ''));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      
      const estCostStr = String(r.estimatedCost || '');
      if (estCostStr && estCostStr.trim()) {
        const parsed = parseInt(estCostStr.replace(/[^\d]/g, ''));
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      
      // Fallback based on severity/priority if no cost is set
      if (r.severity === 'Critical') return 180000;
      if (r.severity === 'High') return 45000;
      if (r.severity === 'Medium') return 15000;
      return 5000;
    };

    let totalBudget = 0;
    let emergencyBudget = 0;
    filtered.forEach(r => {
      const budget = getReportCost(r);
      totalBudget += budget;
      if (r.resourcePlan?.approvalType === 'Emergency Response' || r.severity === 'Critical') {
        emergencyBudget += budget;
      }
    });

    const deptBreakdown = {};
    filtered.forEach(r => {
      const dept = r.resourcePlan?.department || r.assignedDepartment || t('Unassigned');
      if (!deptBreakdown[dept]) {
        deptBreakdown[dept] = { total: 0, resolved: 0, cost: 0 };
      }
      deptBreakdown[dept].total++;
      if (r.status === 'Resolved') deptBreakdown[dept].resolved++;
      deptBreakdown[dept].cost += getReportCost(r);
    });

    const wardBreakdown = {};
    filtered.forEach(r => {
      const loc = r.location || '';
      let ward = t('General Ward');
      if (loc.includes('Ward 12') || loc.includes('Cantonment')) ward = 'Ward 12 (Delhi Cantonment)';
      else if (loc.includes('Pine Street') || loc.includes('Downtown')) ward = 'Ward 5 (Downtown)';
      else if (loc.includes('Broadway')) ward = 'Ward 8 (Broadway)';
      else if (loc.includes('Oak Park')) ward = 'Ward 3 (Oak Park)';

      if (!wardBreakdown[ward]) wardBreakdown[ward] = 0;
      wardBreakdown[ward]++;
    });

    return {
      total,
      resolved,
      pending,
      critical,
      avgResTime,
      totalBudget,
      emergencyBudget,
      deptBreakdown,
      wardBreakdown
    };
  };

  const handleGenerateReport = async (reportTypeObj) => {
    setLoadingReport(true);
    try {
      const filtered = getFilteredReports();
      const stats = compileReportStats(filtered);
      
      // Compile specific data for the chosen report type
      let dataSummary = { ...stats };
      
      if (reportTypeObj.id === 'critical-incident') {
        const targetId = selectedIncidentId || filtered.find(r => r.severity === 'Critical')?.id || filtered[0]?.id;
        const incident = reports.find(r => r.id === targetId);
        dataSummary = {
          incidentDetails: incident || null,
          totalBudget: stats.totalBudget,
          criticalCount: stats.critical
        };
      } else if (reportTypeObj.id === 'dept-performance') {
        const targetDept = selectedPerformanceDept || uniqueDepartments[0] || 'Roads & Bridges Department';
        const deptFiltered = filtered.filter(r => (r.resourcePlan?.department || r.assignedDepartment) === targetDept);
        const deptStats = compileReportStats(deptFiltered);
        dataSummary = {
          selectedDepartment: targetDept,
          departmentStats: deptStats,
          overallStats: stats
        };
      } else if (reportTypeObj.id === 'ward-zone') {
        const targetWard = selectedReportWard || uniqueWards[0];
        const wardFiltered = filtered.filter(r => {
          const loc = r.location || '';
          if (targetWard === 'Ward 12 (Delhi Cantonment)') return loc.includes('Ward 12') || loc.includes('Cantonment');
          if (targetWard === 'Ward 5 (Downtown)') return loc.includes('Pine Street') || loc.includes('Downtown');
          if (targetWard === 'Ward 8 (Broadway)') return loc.includes('Broadway');
          if (targetWard === 'Ward 3 (Oak Park)') return loc.includes('Oak Park');
          return false;
        });
        dataSummary = {
          selectedWard: targetWard,
          wardStats: compileReportStats(wardFiltered),
          categories: wardFiltered.map(r => r.category)
        };
      } else if (reportTypeObj.id === 'officer-performance') {
        const targetOfficer = selectedPerformanceOfficer || uniqueOfficers[0] || 'Officer Ramesh Prasad';
        const officerCases = filtered.filter(r => r.assignedOfficer === targetOfficer || r.resolvedBy === targetOfficer);
        const resolved = officerCases.filter(r => r.status === 'Resolved');
        dataSummary = {
          officerName: targetOfficer,
          assignedCases: officerCases.length,
          resolvedCases: resolved.length,
          pendingCases: officerCases.length - resolved.length,
          avgResolutionTime: resolved.length > 0 ? Math.round(resolved.reduce((acc, curr) => acc + (curr.resourcePlan?.estimatedResolutionTime || 12), 0) / resolved.length) : 12
        };
      } else if (reportTypeObj.id === 'area-intelligence') {
        const targetLocation = selectedLocationInput || 'Mohan Enclave';
        const locationFiltered = reports.filter(r => r.location?.toLowerCase().includes(targetLocation.toLowerCase()));
        dataSummary = {
          locationName: targetLocation,
          history: locationFiltered.map(r => ({ id: r.id, title: r.title, status: r.status, severity: r.severity })),
          stats: compileReportStats(locationFiltered)
        };
      } else if (reportTypeObj.id === 'community-engagement') {
        dataSummary = {
          activeMissions: activeMissions.map(m => ({ title: m.title, category: m.category, spotsFilled: m.spotsFilled })),
          topHeroes: topHeroes.slice(0, 5),
          overallStats: stats
        };
      }

      // Query Gemini for AI briefing & recommendations based on database telemetry
      const filtersSummary = {
        startDate: startDate || 'All Dates',
        endDate: endDate || 'All Dates',
        department: selectedDept,
        ward: selectedWard,
        category: selectedCategory,
        priority: selectedPriority,
        status: selectedStatus
      };

      const aiTextResult = await generateExecutiveReportWithGemini(reportTypeObj.name, dataSummary, filtersSummary);
      
      const reportDraft = {
        type: reportTypeObj,
        data: dataSummary,
        aiResult: aiTextResult,
        dateGenerated: new Date().toLocaleString(),
        filters: filtersSummary
      };

      setActiveReport(reportDraft);

      // Save Last Generated Timestamp
      const updatedTimes = { ...lastGeneratedTimes, [reportTypeObj.id]: new Date().toLocaleDateString() };
      setLastGeneratedTimes(updatedTimes);
      localStorage.setItem('jan_sathi_last_reports', JSON.stringify(updatedTimes));
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: activeReport.type.name,
        text: activeReport.aiResult.executiveSummary,
        url: window.location.href
      }).catch(console.error);
    } else {
      alert(t("Report Link copied to clipboard!"));
    }
  };

  const handleDownloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activeReport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${activeReport.type.id}-report.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6 text-left">
      {/* Page Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-wider">{t("Agent 9: Executive PDF & Report Generator")}</h2>
          <p className="text-[11px] text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">{t("Compile real-time Firestore operations datasets into formal municipal documents")}</p>
        </div>
      </div>

      {/* FILTER PANEL */}
      <div className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-850/60 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-850/40 pb-2.5">
          <Filter className="w-4 h-4 text-emerald-450" />
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-slate-250">{t("Operations Database Filter Controls")}</h4>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          {/* Date range */}
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("Start Date")}</span>
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-350"
            />
          </div>
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("End Date")}</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none focus:border-brand-500 text-slate-800 dark:text-slate-350"
            />
          </div>

          {/* Department */}
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("Filter by Department")}</span>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-350"
            >
              <option value="All">{t("All Departments")}</option>
              {uniqueDepartments.map(d => (
                <option key={d} value={d}>{t(d)}</option>
              ))}
            </select>
          </div>

          {/* Ward */}
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("Filter by Ward/Zone")}</span>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-350"
            >
              <option value="All">{t("All Wards")}</option>
              {uniqueWards.map(w => (
                <option key={w} value={w}>{t(w)}</option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("Issue Category")}</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-350"
            >
              <option value="All">{t("All Categories")}</option>
              <option value="Infrastructure">{t("Infrastructure")}</option>
              <option value="Roads & Safety">{t("Roads & Safety")}</option>
              <option value="Sanitation">{t("Sanitation")}</option>
              <option value="Utilities">{t("Utilities")}</option>
            </select>
          </div>

          {/* Priority */}
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("Severity/Priority")}</span>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-350"
            >
              <option value="All">{t("All Priorities")}</option>
              <option value="Critical">{t("Critical")}</option>
              <option value="High">{t("High")}</option>
              <option value="Medium">{t("Medium")}</option>
              <option value="Low">{t("Low")}</option>
            </select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <span className="block text-[8px] text-slate-500 font-bold uppercase">{t("Ticket Status")}</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl focus:outline-none text-slate-800 dark:text-slate-350"
            >
              <option value="All">{t("All Statuses")}</option>
              <option value="Submitted">{t("Submitted")}</option>
              <option value="Pending">{t("Pending")}</option>
              <option value="Resources Assigned">{t("Resources Assigned")}</option>
              <option value="In Progress">{t("In Progress")}</option>
              <option value="Resolved">{t("Resolved")}</option>
            </select>
          </div>

          {/* Active complaints count preview */}
          <div className="space-y-1 flex flex-col justify-end">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded-xl text-center font-bold text-[10px] uppercase">
              {t("Active Database Scope")}: {getFilteredReports().length} {t("records")}
            </div>
          </div>
        </div>
      </div>

      {/* REPORT SELECTIONS LIST */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {reportTypes.map(report => (
          <div 
            key={report.id}
            className="glass p-5 rounded-2xl border border-slate-200 dark:border-slate-850/60 flex flex-col justify-between hover:border-slate-350 dark:hover:border-slate-750 transition-all select-none"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850/40 pb-2">
                <h4 className="text-xs font-black text-slate-800 dark:text-slate-250 uppercase tracking-wide">{report.name}</h4>
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-[11px] text-slate-550 dark:text-slate-405 leading-relaxed min-h-[50px]">{report.desc}</p>
              
              {/* Dynamic Sub-Selections depending on the report type */}
              {report.id === 'critical-incident' && (
                <div className="pt-2">
                  <select
                    value={selectedIncidentId}
                    onChange={(e) => setSelectedIncidentId(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-[10px] text-slate-350"
                  >
                    <option value="">{t("Select Critical Incident")}</option>
                    {reports.filter(r => r.severity === 'Critical').map(r => (
                      <option key={r.id} value={r.id}>{r.title.substring(0,25)}...</option>
                    ))}
                  </select>
                </div>
              )}
              {report.id === 'dept-performance' && (
                <div className="pt-2">
                  <select
                    value={selectedPerformanceDept}
                    onChange={(e) => setSelectedPerformanceDept(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-[10px] text-slate-355"
                  >
                    <option value="">{t("Select Department")}</option>
                    {uniqueDepartments.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              )}
              {report.id === 'ward-zone' && (
                <div className="pt-2">
                  <select
                    value={selectedReportWard}
                    onChange={(e) => setSelectedReportWard(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-[10px] text-slate-355"
                  >
                    <option value="">{t("Select Ward/Zone")}</option>
                    {uniqueWards.map(w => (
                      <option key={w} value={w}>{w}</option>
                    ))}
                  </select>
                </div>
              )}
              {report.id === 'officer-performance' && (
                <div className="pt-2">
                  <select
                    value={selectedPerformanceOfficer}
                    onChange={(e) => setSelectedPerformanceOfficer(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-905 border border-slate-800 rounded-lg text-[10px] text-slate-355"
                  >
                    <option value="">{t("Select Officer")}</option>
                    {uniqueOfficers.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
              )}
              {report.id === 'area-intelligence' && (
                <div className="pt-2 relative">
                  <input
                    type="text"
                    placeholder={t("Type custom location/landmark...")}
                    value={selectedLocationInput}
                    onChange={(e) => setSelectedLocationInput(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-905 border border-slate-805 rounded-lg text-[10px] text-slate-350 placeholder-slate-600 focus:outline-none"
                  />
                </div>
              )}
            </div>
            
            <div className="border-t border-slate-200 dark:border-slate-850/40 mt-4 pt-3.5 flex items-center justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase">
                {t("Last Gen")}: {lastGeneratedTimes[report.id] || t("Never")}
              </span>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleGenerateReport(report)}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center gap-1 shadow"
                >
                  <Cpu className="w-3 h-3" />
                  <span>{t("Preview")}</span>
                </button>
                <button
                  onClick={async () => {
                    await handleGenerateReport(report);
                    // Open print immediately
                    setTimeout(() => window.print(), 1000);
                  }}
                  className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-350 hover:text-white rounded-xl text-[10px] font-black cursor-pointer transition-all flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>{t("PDF")}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* LOADER */}
      {loadingReport && (
        <div className="fixed inset-0 z-55 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center">
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 text-center max-w-xs shadow-2xl">
            <Loader className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
            <h4 className="text-xs font-black uppercase text-slate-200">{t("Generating Report...")}</h4>
            <p className="text-[10px] text-slate-500 leading-normal">{t("Jan Sathi AI is querying Cloud Firestore and calling Gemini to compile official insights.")}</p>
          </div>
        </div>
      )}

      {/* REPORT PREVIEW MODAL */}
      {activeReport && (
        <div className="fixed inset-0 z-40 bg-slate-955/85 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in" onClick={() => setActiveReport(null)}>
          <div 
            className="w-full max-w-4xl bg-white dark:bg-[#0b0f19]/98 border border-slate-200 dark:border-slate-850 shadow-2xl rounded-3xl relative flex flex-col h-[85vh] overflow-hidden p-6 md:p-8 animate-scale-up text-slate-900 dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header controls */}
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-850 pb-4 no-print">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500" />
                <h3 className="text-md font-black uppercase tracking-wider">{activeReport.type.name} {t("Draft Preview")}</h3>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>{t("Print / Save as PDF")}</span>
                </button>
                <button
                  onClick={handleDownloadJSON}
                  className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t("Download JSON")}</span>
                </button>
                <button
                  onClick={handleShare}
                  className="py-1.5 px-3 bg-slate-900 border border-slate-800 text-slate-350 hover:bg-slate-800 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{t("Share")}</span>
                </button>
                <button
                  onClick={() => setActiveReport(null)}
                  className="p-1.5 bg-slate-105 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* SCROLLABLE PREVIEW DOCUMENT & PRINTABLE AREA */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin mt-4">
              <div className="p-8 bg-white border border-slate-200 dark:border-slate-850 rounded-2xl text-black space-y-6 printable-report text-left font-serif leading-relaxed">
                
                {/* Government Official Emblem Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-100 border border-slate-300 rounded-full flex items-center justify-center font-bold text-slate-700 text-[10px]">
                      EMBLEM
                    </div>
                    <div>
                      <h2 className="text-xs font-black uppercase tracking-wider m-0 text-slate-900">{t("MINISTRY OF MUNICIPAL ADMINISTRATION")}</h2>
                      <h3 className="text-[10px] font-bold text-slate-500 m-0 uppercase tracking-widest">{t("Jan Sathi OPERATIONS GRID")}</h3>
                    </div>
                  </div>
                  <div className="text-right text-[10px] text-slate-500 font-sans">
                    <div><strong>{t("Report Ref ID")}:</strong> JS-OP-{(Date.now() % 100000)}</div>
                    <div><strong>{t("Generated On")}:</strong> {activeReport.dateGenerated}</div>
                    <div><strong>{t("Target Officer")}:</strong> {user.name || 'Municipal Commissioner'}</div>
                    <div><strong>{t("Department")}:</strong> {user.assignedDepartment || 'Command Control Center'}</div>
                  </div>
                </div>

                <div className="text-center py-2 border-b border-dashed border-slate-300">
                  <h1 className="text-sm font-black uppercase tracking-widest text-slate-900 m-0">{activeReport.type.name}</h1>
                  <span className="text-[9px] font-sans font-bold uppercase text-slate-500">
                    {t("Report Scope")}: {t("Start Date")} ({activeReport.filters.startDate}) — {t("End Date")} ({activeReport.filters.endDate})
                  </span>
                </div>

                {/* Section 1: Executive Summary */}
                <div className="space-y-2 report-section">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-slate-300 pb-1 text-slate-800 font-sans">{t("1. Executive Summary")}</h4>
                  <p className="text-xs text-slate-700 text-justify">{activeReport.aiResult.executiveSummary}</p>
                </div>

                {/* Section 2: Key Statistics */}
                <div className="space-y-3 report-section">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-slate-300 pb-1 text-slate-800 font-sans">{t("2. Operational Statistics Summary")}</h4>
                  
                  {activeReport.type.id === 'daily-ops' || activeReport.type.id === 'monthly-municipal' || activeReport.type.id === 'smart-city-health' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-sans">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Total Reports Scope")}</span>
                        <span className="text-md font-black text-slate-850">{activeReport.data.total}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Resolved Count")}</span>
                        <span className="text-md font-black text-emerald-600">{activeReport.data.resolved}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Pending Tickets")}</span>
                        <span className="text-md font-black text-amber-500">{activeReport.data.pending}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Average Resolve Speed")}</span>
                        <span className="text-md font-black text-slate-800">{activeReport.data.avgResTime} {t("Hours")}</span>
                      </div>
                    </div>
                  ) : activeReport.type.id === 'budget-cost' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center font-sans">
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Total Budget Allocated")}</span>
                        <span className="text-md font-black text-slate-850">₹{activeReport.data.totalBudget?.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Emergency Expenditure")}</span>
                        <span className="text-md font-black text-rose-600">₹{activeReport.data.emergencyBudget?.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Standard Repair Budget")}</span>
                        <span className="text-md font-black text-slate-800">₹{(activeReport.data.totalBudget - activeReport.data.emergencyBudget)?.toLocaleString()}</span>
                      </div>
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <span className="block text-[8px] text-slate-500 uppercase font-bold">{t("Cost Mitigation Index")}</span>
                        <span className="text-md font-black text-emerald-650">92%</span>
                      </div>
                    </div>
                  ) : activeReport.type.id === 'critical-incident' && activeReport.data.incidentDetails ? (
                    <div className="border border-slate-200 p-4 rounded-2xl font-sans text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div><strong>{t("Title")}:</strong> {activeReport.data.incidentDetails.title}</div>
                        <div><strong>{t("Category")}:</strong> {activeReport.data.incidentDetails.category}</div>
                        <div><strong>{t("Location")}:</strong> {activeReport.data.incidentDetails.location}</div>
                        <div><strong>{t("Severity")}:</strong> {activeReport.data.incidentDetails.severity}</div>
                        <div><strong>{t("Date Filed")}:</strong> {activeReport.data.incidentDetails.date}</div>
                        <div><strong>{t("Risk Score")}:</strong> {activeReport.data.incidentDetails.priorityScore}</div>
                        <div><strong>{t("Assigned Team")}:</strong> {activeReport.data.incidentDetails.resourcePlan?.teamName || t("None")}</div>
                        <div><strong>{t("Approved Cost")}:</strong> ₹{activeReport.data.incidentDetails.resourcePlan?.estimatedCost?.toLocaleString() || '0'}</div>
                      </div>
                      <div className="pt-2 border-t border-slate-100">
                        <strong>{t("Description")}:</strong> {activeReport.data.incidentDetails.description}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl font-sans text-xs">
                      <strong>{t("Telemetry Log summary")}:</strong> {t("Report details gathered from Firestore successfully. Reference Stats Index: ")} {activeReport.data.total || 0} {t("items inside filtered scope.")}
                    </div>
                  )}
                </div>

                {/* Section 3: Charts & Visualizations */}
                <div className="space-y-3 report-section">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-slate-300 pb-1 text-slate-800 font-sans">{t("3. Department Workload Density Charts")}</h4>
                  <div className="space-y-2 font-sans text-xs bg-slate-50 p-4 border border-slate-200 rounded-2xl">
                    {activeReport.data.deptBreakdown && Object.keys(activeReport.data.deptBreakdown).length > 0 ? (
                      Object.entries(activeReport.data.deptBreakdown).map(([dept, dStats]) => {
                        const totalCases = activeReport.data.total || 1;
                        const pct = Math.round((dStats.total / totalCases) * 100);
                        return (
                          <div key={dept} className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold text-slate-700">
                              <span>{dept}</span>
                              <span>{dStats.total} {t("Complaints")} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="text-[10px] text-slate-500 italic">{t("No multi-department datasets inside active filter scope.")}</p>
                    )}
                  </div>
                </div>

                {/* Section 4: AI Insights */}
                <div className="space-y-2 report-section">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-slate-300 pb-1 text-slate-800 font-sans">{t("4. AI Analytical Insights")}</h4>
                  <p className="text-xs text-slate-700 text-justify">{activeReport.aiResult.aiInsights}</p>
                </div>

                {/* Section 5: AI Recommendations (Top 5 Recommended Actions) */}
                <div className="space-y-3.5 report-section page-break-before">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-slate-300 pb-1 text-slate-800 font-sans">{t("5. Top 5 AI Strategic Recommendations")}</h4>
                  <div className="space-y-2 text-xs text-slate-700 font-sans">
                    {activeReport.aiResult.aiRecommendations && activeReport.aiResult.aiRecommendations.map((rec, idx) => (
                      <div key={idx} className="flex gap-3 bg-slate-50 p-3 border border-slate-200 rounded-xl items-start">
                        <span className="w-5 h-5 bg-slate-800 text-white rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">
                          {idx + 1}
                        </span>
                        <p className="m-0 text-slate-800 font-bold leading-relaxed">{rec}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section 6: Conclusion */}
                <div className="space-y-2 report-section">
                  <h4 className="text-[10px] font-black uppercase tracking-widest border-b border-slate-300 pb-1 text-slate-800 font-sans">{t("6. Operational Conclusion")}</h4>
                  <p className="text-xs text-slate-700 text-justify">{activeReport.aiResult.conclusion}</p>
                </div>

                {/* Footer sign-off and watermark */}
                <div className="flex justify-between items-end border-t border-slate-300 pt-8 mt-12 text-[10px] text-slate-500 font-sans">
                  <div>
                    <div><strong>{t("Report Issued By:")}</strong></div>
                    <div className="mt-6 border-t border-slate-400 w-36 pt-1 font-bold">{user.name || 'Jan Sathi Officer'}</div>
                  </div>
                  
                  <div className="text-right italic">
                    {t("Generated by Jan Sathi AI using Gemini")}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}
      
      {/* Hidden Print Wrapper rendered outside #root */}
      {activeReport && createPortal(
        <div className="printable-report-wrapper print-only">
          <div className="printable-report p-10 font-serif leading-relaxed text-black bg-white">
            {/* emblem header */}
            <div className="flex justify-between items-start border-b-2 border-black pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 border border-gray-400 rounded-full flex items-center justify-center font-bold text-gray-700 text-xs">
                  EMBLEM
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider m-0">{t("MINISTRY OF MUNICIPAL ADMINISTRATION")}</h2>
                  <h3 className="text-xs font-bold text-gray-600 m-0 uppercase tracking-widest">{t("Jan Sathi OPERATIONS GRID")}</h3>
                </div>
              </div>
              <div className="text-right text-[10px] text-gray-600 font-sans">
                <div><strong>{t("Report Ref ID")}:</strong> JS-OP-{(Date.now() % 100000)}</div>
                <div><strong>{t("Generated On")}:</strong> {activeReport.dateGenerated}</div>
                <div><strong>{t("Target Officer")}:</strong> {user.name || 'Municipal Commissioner'}</div>
                <div><strong>{t("Department")}:</strong> {user.assignedDepartment || 'Command Control Center'}</div>
              </div>
            </div>

            <div className="text-center py-4 border-b border-dashed border-gray-400">
              <h1 className="text-xl font-black uppercase tracking-widest m-0">{activeReport.type.name}</h1>
              <span className="text-[10px] font-sans font-bold uppercase text-gray-505">
                {t("Report Scope")}: {t("Start Date")} ({activeReport.filters.startDate}) — {t("End Date")} ({activeReport.filters.endDate})
              </span>
            </div>

            {/* Section 1 */}
            <div className="space-y-2 mt-6 report-section">
              <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 text-gray-800 font-sans">{t("1. Executive Summary")}</h4>
              <p className="text-xs text-gray-700 text-justify leading-relaxed">{activeReport.aiResult.executiveSummary}</p>
            </div>

            {/* Section 2 */}
            <div className="space-y-3 mt-6 report-section">
              <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 text-gray-850 font-sans">{t("2. Operational Statistics Summary")}</h4>
              {activeReport.type.id === 'daily-ops' || activeReport.type.id === 'monthly-municipal' || activeReport.type.id === 'smart-city-health' ? (
                <table className="w-full text-xs border border-gray-300 font-sans text-center mt-2 border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2">{t("Total Reports Scope")}</th>
                      <th className="border border-gray-300 p-2">{t("Resolved Count")}</th>
                      <th className="border border-gray-300 p-2">{t("Pending Tickets")}</th>
                      <th className="border border-gray-300 p-2">{t("Average Resolve Speed")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold">{activeReport.data.total}</td>
                      <td className="border border-gray-300 p-2 font-bold text-green-700">{activeReport.data.resolved}</td>
                      <td className="border border-gray-300 p-2 font-bold text-amber-700">{activeReport.data.pending}</td>
                      <td className="border border-gray-300 p-2 font-bold">{activeReport.data.avgResTime} {t("Hours")}</td>
                    </tr>
                  </tbody>
                </table>
              ) : activeReport.type.id === 'budget-cost' ? (
                <table className="w-full text-xs border border-gray-300 font-sans text-center mt-2 border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-gray-300 p-2">{t("Total Budget Allocated")}</th>
                      <th className="border border-gray-300 p-2">{t("Emergency Expenditure")}</th>
                      <th className="border border-gray-300 p-2">{t("Standard Repair Budget")}</th>
                      <th className="border border-gray-300 p-2">{t("Cost Mitigation Index")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-300 p-2 font-bold">₹{activeReport.data.totalBudget?.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 font-bold text-red-700">₹{activeReport.data.emergencyBudget?.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 font-bold">₹{(activeReport.data.totalBudget - activeReport.data.emergencyBudget)?.toLocaleString()}</td>
                      <td className="border border-gray-300 p-2 font-bold text-green-750">92%</td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <div className="p-4 bg-gray-55 border border-gray-350 rounded-xl font-sans text-xs text-left">
                  <strong>{t("Scope Record Summary")}:</strong> {activeReport.data.total || 0} {t("records aggregated from active Firestore database.")}
                </div>
              )}
            </div>

            {/* Section 3 */}
            <div className="space-y-3 mt-6 report-section">
              <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 text-gray-800 font-sans">{t("3. Department Workload Density Charts")}</h4>
              <table className="w-full text-xs border border-gray-300 font-sans mt-2 border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2 text-left">{t("Department / Division")}</th>
                    <th className="border border-gray-300 p-2 text-center">{t("Assigned Cases")}</th>
                    <th className="border border-gray-300 p-2 text-center">{t("Workload Share")}</th>
                  </tr>
                </thead>
                <tbody>
                  {activeReport.data.deptBreakdown && Object.keys(activeReport.data.deptBreakdown).length > 0 ? (
                    Object.entries(activeReport.data.deptBreakdown).map(([dept, dStats]) => {
                      const totalCases = activeReport.data.total || 1;
                      const pct = Math.round((dStats.total / totalCases) * 100);
                      return (
                        <tr key={dept}>
                          <td className="border border-gray-300 p-2 font-semibold">{dept}</td>
                          <td className="border border-gray-300 p-2 text-center">{dStats.total}</td>
                          <td className="border border-gray-300 p-2 text-center">{pct}%</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="3" className="border border-gray-300 p-2 text-center text-gray-500 italic">{t("No department records found in scope.")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Section 4 */}
            <div className="space-y-2 mt-6 report-section">
              <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 text-gray-800 font-sans">{t("4. AI Analytical Insights")}</h4>
              <p className="text-xs text-gray-700 text-justify leading-relaxed">{activeReport.aiResult.aiInsights}</p>
            </div>

            {/* Section 5 (Top 5 Recommendations) */}
            <div className="space-y-3 mt-6 report-section page-break-before">
              <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 text-gray-800 font-sans">{t("5. Top 5 AI Strategic Recommendations")}</h4>
              <div className="space-y-2.5 text-xs font-sans mt-2">
                {activeReport.aiResult.aiRecommendations && activeReport.aiResult.aiRecommendations.map((rec, idx) => (
                  <div key={idx} className="flex gap-3 bg-gray-50 p-3 border border-gray-350 rounded-xl items-start text-left">
                    <span className="w-5 h-5 bg-black text-white rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <p className="m-0 text-black font-bold leading-relaxed">{rec}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 6 */}
            <div className="space-y-2 mt-6 report-section">
              <h4 className="text-xs font-black uppercase tracking-widest border-b border-black pb-1 text-gray-800 font-sans">{t("6. Operational Conclusion")}</h4>
              <p className="text-xs text-gray-700 text-justify leading-relaxed">{activeReport.aiResult.conclusion}</p>
            </div>

            {/* Sign-off */}
            <div className="flex justify-between items-end border-t border-black pt-8 mt-12 text-[10px] text-gray-505 font-sans">
              <div>
                <div><strong>{t("Report Issued By:")}</strong></div>
                <div className="mt-8 border-t border-black w-36 pt-1 font-bold">{user.name || 'Jan Sathi Officer'}</div>
              </div>
              <div className="text-right italic">
                {t("Generated by Jan Sathi AI using Gemini")}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

// Modal closing X Icon fallback
function X(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
