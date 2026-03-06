"use client";

import React from 'react';
import { ShieldCheck, AlertTriangle, Wind, Activity, Heart, Info } from 'lucide-react';

interface SummaryData {
    maxAQI: number;
    hotspotSite: string;
    category: string;
    color: string;
    parameter: string;
}

export default function SummaryCards({ summary }: { summary: SummaryData | null }) {
    if (!summary) return null;

    const getHealthTip = (category: string) => {
        switch (category) {
            case 'Good':
                return "It's a great day for outdoor activities! Air quality is considered satisfactory.";
            case 'Moderate':
                return "Unusually sensitive people should consider reducing prolonged or heavy exertion outdoors.";
            case 'Unhealthy for Sensitive Groups':
                return "Members of sensitive groups may experience health effects. The general public is less likely to be affected.";
            case 'Unhealthy':
                return "Everyone may begin to experience health effects; members of sensitive groups may experience more serious health effects.";
            case 'Very Unhealthy':
                return "Health alert: everyone may experience more serious health effects. Avoid all outdoor physical activity.";
            case 'Hazardous':
                return "Health warnings of emergency conditions. The entire population is more likely to be affected.";
            default:
                return "Check local air quality reports for detailed information and forecasts.";
        }
    };

    const getStatusEmoji = (category: string) => {
        if (category === 'Good') return "😊";
        if (category === 'Moderate') return "👍";
        return "⚠️";
    };

    const getStatusMessage = (category: string) => {
        if (category === 'Good') return "Mississippi is Breathing Easy";
        if (category === 'Moderate') return "Air Quality is Acceptable";
        return "Elevated Levels Detected";
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
            {/* Statewide Status Card */}
            <div className="bg-white/80 backdrop-blur-md border border-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center gap-4 mb-4 relative">
                    <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-600">
                        <Wind size={24} />
                    </div>
                    <div>
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Statewide Status</h3>
                        <p className="text-slate-800 font-bold text-lg leading-tight">
                            {getStatusMessage(summary.category)}
                        </p>
                    </div>
                </div>
                <div className="flex items-baseline gap-2 relative">
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{getStatusEmoji(summary.category)}</span>
                    <span className="text-slate-500 font-medium text-sm">Overall: <span className="text-slate-800 font-bold">{summary.category}</span></span>
                </div>
            </div>

            {/* Hotspot Card */}
            <div className="bg-white/80 backdrop-blur-md border border-white rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-red-50 rounded-full opacity-50 group-hover:scale-110 transition-transform duration-500"></div>
                <div className="flex items-center gap-4 mb-4 relative">
                    <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600">
                        <Activity size={24} />
                    </div>
                    <div>
                        <h3 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Highest Reported Site</h3>
                        <p className="text-slate-800 font-bold text-lg leading-tight truncate max-w-[180px]">
                            {summary.hotspotSite}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative">
                    <div
                        className="text-2xl font-black px-3 py-1 rounded-xl text-white shadow-sm"
                        style={{ backgroundColor: summary.color }}
                    >
                        {summary.maxAQI}
                    </div>
                    <div className="text-xs font-medium text-slate-500">
                        Top Pollutant:<br />
                        <span className="text-slate-800 font-bold">{summary.parameter}</span>
                    </div>
                </div>
            </div>

            {/* Health Recommendation Card */}
            <div className="bg-[#0b3d91] text-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all group relative overflow-hidden md:col-span-1">
                <div className="absolute right-0 bottom-0 opacity-10 group-hover:scale-110 transition-transform duration-500">
                    <Heart size={120} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-4 mb-3 relative">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <ShieldCheck size={20} />
                    </div>
                    <h3 className="font-bold text-sm uppercase tracking-wider">Health Recommendation</h3>
                </div>
                <p className="text-white/90 text-sm leading-relaxed font-medium relative italic">
                    "{getHealthTip(summary.category)}"
                </p>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-white/60 font-bold uppercase tracking-widest relative">
                    <Info size={12} />
                    Stay Safe, Mississippi
                </div>
            </div>
        </div>
    );
}
