import React from 'react';
import { AlertTriangle, AlertCircle, Clock, CheckCircle, CheckCircle2 } from 'lucide-react';

export default function SeverityBadge({ severity, status }) {
  const isResolved = status === 'Resolved' || severity === 'Resolved';
  
  // Style mapping
  let config = {
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: CheckCircle2,
    label: 'Resolved',
    desc: 'This issue has been inspected and resolved by municipal staff.'
  };

  if (!isResolved) {
    switch (severity) {
      case 'Critical':
        config = {
          color: 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse',
          icon: AlertTriangle,
          label: 'Critical Priority',
          desc: 'High danger or safety hazard. Immediate dispatch recommended.'
        };
        break;
      case 'High':
        config = {
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: AlertCircle,
          label: 'High Priority',
          desc: 'Significant hazard. Dispatched for crew maintenance within 48h.'
        };
        break;
      case 'Medium':
        config = {
          color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
          icon: Clock,
          label: 'Medium Priority',
          desc: 'Normal civic complaint. Queued for regional inspection.'
        };
        break;
      case 'Low':
      default:
        config = {
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: CheckCircle,
          label: 'Low Priority',
          desc: 'Minor issue. Logged in queue for general maintenance.'
        };
        break;
    }
  }

  const IconComponent = config.icon;

  return (
    <div className="relative group inline-block">
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider transition-all duration-300 hover:scale-105 cursor-help ${config.color}`}>
        <IconComponent className="w-3 h-3 shrink-0" />
        <span>{config.label}</span>
      </span>
      
      {/* Tooltip Overlay */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 hidden group-hover:block z-50 pointer-events-none">
        <div className="bg-slate-950 border border-slate-800 text-[10px] text-slate-300 p-2.5 rounded-lg shadow-xl text-center leading-normal backdrop-blur-md">
          <span className="font-bold text-white block mb-0.5">{config.label}</span>
          {config.desc}
        </div>
      </div>
    </div>
  );
}
