import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  ShieldAlert, Clock, CheckCircle2, Users, 
  MapPin, AlertCircle, Award, Check, Loader 
} from 'lucide-react';
import { formatDate } from '../utils/helpers';

const INITIAL_PENDING_REPORTS = [
  {
    id: 'rep-101',
    title: 'Gas Leak Near Public School',
    category: 'Infrastructure',
    location: '120 Oakwood Lane, adjacent to Elementary School',
    date: '2026-06-26',
    reporter: 'Marcus Chen',
    description: 'Strong smell of natural gas detected near the playground fence line. Gas company notified but needs immediate civic inspection.',
    pointsValue: 120,
    priorityScore: 95,
    severity: 'Critical'
  },
  {
    id: 'rep-102',
    title: 'Damaged Guardrail',
    category: 'Roads & Safety',
    location: 'Highway 10 Exit 4 Ramp',
    date: '2026-06-25',
    reporter: 'David Vance',
    description: 'A portion of the metal guardrail is bent outwards, exposing a sharp edge that poses a risk to passing vehicles.',
    pointsValue: 75,
    priorityScore: 82,
    severity: 'Critical'
  },
  {
    id: 'rep-103',
    title: 'Illegal Dumping',
    category: 'Sanitation',
    location: 'Woodland Trail South entrance',
    date: '2026-06-24',
    reporter: 'Sarah Jenkins',
    description: 'Several bags of construction debris and tires have been dumped at the trailhead entrance.',
    pointsValue: 50,
    priorityScore: 50,
    severity: 'Medium'
  },
  {
    id: 'rep-104',
    title: 'Graffiti on Library Wall',
    category: 'Public Space',
    location: 'West Street Public Library',
    date: '2026-06-21',
    reporter: 'Alex Carter',
    description: 'Spray paint tagging on the brick wall facing the parking lot. Needs removal.',
    pointsValue: 30,
    priorityScore: 20,
    severity: 'Low'
  }
];

export default function OfficerDashboard() {
  const { user, loading } = useAuth();
  
  // Sort queue by Gemini Priority Score in descending order (highest score first)
  const [pendingQueue, setPendingQueue] = useState(() => 
    [...INITIAL_PENDING_REPORTS].sort((a, b) => b.priorityScore - a.priorityScore)
  );
  
  const [verifiedCount, setVerifiedCount] = useState(14);
  const [processingId, setProcessingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== 'officer') {
    return (
      <div className="glass p-12 text-center rounded-2xl max-w-md mx-auto border border-rose-500/30 bg-rose-950/10 text-rose-450 mt-12 animate-fade-in">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h3 className="font-bold text-xl text-white">Officer Access Denied</h3>
        <p className="text-slate-400 text-sm mt-2">
          This portal requires official municipal credentials. Please sign in as a Government Officer.
        </p>
      </div>
    );
  }

  const handleVerifyReport = (id, reporter, points) => {
    setProcessingId(id);
    
    // Simulate resolving delay (updates Firestore in production)
    setTimeout(() => {
      setPendingQueue(prev => prev.filter(item => item.id !== id));
      setVerifiedCount(prev => prev + 1);
      setSuccessMsg(`Report successfully verified! Disbursed +${points} Community Points to ${reporter}.`);
      setProcessingId(null);
      
      // Auto-hide alert after 4s
      setTimeout(() => setSuccessMsg(''), 4000);
    }, 1000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 animate-fade-in relative">
      
      {/* Toast alert */}
      {successMsg && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-3 px-5 py-4 rounded-xl shadow-2xl border border-emerald-500/30 text-emerald-400 bg-emerald-950/20 glass animate-slide-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span className="text-xs font-semibold">{successMsg}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <section className="glass rounded-3xl p-6 md:p-8 border border-slate-800/60 shadow-xl relative overflow-hidden">
        <div className="absolute top-1/2 right-10 -translate-y-1/2 w-48 h-48 bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center gap-5 relative z-10 text-center sm:text-left">
          <div className="p-4 bg-slate-900 border border-slate-800 text-blue-400 rounded-2xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold tracking-wider uppercase mb-1">
              Officer Console: {user.department || 'General Administration'}
            </div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight">
              Welcome back, Officer {user.name.split(' ')[0]}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm">
              Review and approve community service submissions, verify public reports, and authorize point disbursements.
            </p>
          </div>
        </div>
      </section>

      {/* Statistics Block */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pending Claims */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-blue-500/20 transition-all">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Awaiting Review</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{pendingQueue.length} claims</span>
          </div>
        </div>

        {/* Verified Claims */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-emerald-500/20 transition-all">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Approved</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">{verifiedCount} items</span>
          </div>
        </div>

        {/* Active Volunteers */}
        <div className="glass p-5 rounded-2xl border border-slate-800/60 flex items-center gap-4 hover:border-purple-500/20 transition-all">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Volunteers</span>
            <span className="text-xl md:text-2xl font-extrabold text-white block mt-0.5">86 Enrolled</span>
          </div>
        </div>
      </section>

      {/* Verification Queue Table */}
      <section className="space-y-4">
        <div className="flex justify-between items-end border-b border-slate-800/60 pb-3">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Gemini Priority Queue</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Claims automatically sorted by Gemini safety risk analysis (highest priority first)
            </p>
          </div>
          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest bg-blue-500/5 px-3 py-1 rounded-lg border border-blue-500/10">
            🤖 Gemini Auto-Sorted
          </span>
        </div>

        {pendingQueue.length === 0 ? (
          <div className="glass p-12 text-center rounded-2xl border border-slate-800/60">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="font-bold text-base text-white">Queue Cleared!</h3>
            <p className="text-slate-400 text-xs mt-1">There are no pending reports left in your queue.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingQueue.map((report) => (
              <div 
                key={report.id}
                className="glass p-6 rounded-2xl border border-slate-800/60 hover:border-slate-700/60 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-blue-400 font-bold tracking-wider uppercase">{report.category}</span>
                      <span className={`px-2 py-0.2 rounded-full text-[8px] font-extrabold tracking-wider uppercase border ${
                        report.severity === 'Critical' ? 'bg-rose-500/10 text-rose-450 border-rose-500/30 animate-pulse' :
                        report.severity === 'High' ? 'bg-amber-500/10 text-amber-450 border-amber-500/30' :
                        report.severity === 'Medium' ? 'bg-blue-500/10 text-blue-450 border-blue-500/30' :
                        'bg-slate-800 text-slate-405 border-slate-700'
                      }`}>
                        {report.severity}
                      </span>
                    </div>
                    <h3 className="font-bold text-base text-white mt-0.5">{report.title}</h3>
                  </div>
                  
                  {/* Action Buttons */}
                  <button
                    onClick={() => handleVerifyReport(report.id, report.reporter, report.pointsValue)}
                    disabled={processingId === report.id}
                    className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold transition-all hover:scale-[1.01] cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
                  >
                    {processingId === report.id ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Verify & Disburse Points</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-slate-350 text-xs leading-relaxed">{report.description}</p>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3.5 border-t border-slate-800/40 text-[10px] text-slate-400 font-semibold">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{report.location}</span>
                    </span>
                    <span>•</span>
                    <span>Reported by: <span className="text-slate-200">{report.reporter}</span></span>
                    <span>•</span>
                    <span>{report.date}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-slate-400 font-semibold">Priority: <span className="text-blue-400 font-bold">{report.priorityScore}/100</span></span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 font-bold">
                      +{report.pointsValue} XP Reward
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

    </div>
  );
}
