"use client";

import React from 'react';
import { ShieldCheck, Activity, Wind, Heart } from 'lucide-react';

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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10 animate-in fade-in slide-in-from-top-6 duration-1000 ease-out">
            {/* Statewide Status Card */}
            <div className="glass-card p-8 group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex items-center gap-5 mb-6 relative">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/10">
                        <Wind size={28} />
                    </div>
                    <div>
                        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Statewide Status</h3>
                        <p className="text-slate-900 dark:text-white font-black text-xl leading-tight mt-0.5">
                            {getStatusMessage(summary.category)}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3 relative">
                    <span className="text-5xl font-black">{getStatusEmoji(summary.category)}</span>
                    <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Current Condition</span>
                        <span className="text-slate-900 dark:text-white font-black text-lg">{summary.category}</span>
                    </div>
                </div>
            </div>

            {/* Hotspot Card */}
            <div className="glass-card p-8 group relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                <div className="flex items-center gap-5 mb-6 relative">
                    <div className="w-14 h-14 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 shadow-inner border border-orange-500/10">
                        <Activity size={28} />
                    </div>
                    <div>
                        <h3 className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Regional Hotspot</h3>
                        <p className="text-slate-900 dark:text-white font-black text-xl leading-tight mt-0.5 truncate max-w-[160px]">
                            {summary.hotspotSite}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4 relative">
                    <div
                        className="text-3xl font-black px-5 py-2 rounded-2xl text-white shadow-2xl transform group-hover:scale-110 transition-transform duration-300"
                        style={{ 
                            backgroundColor: summary.color,
                            boxShadow: `0 10px 30px -10px ${summary.color}80`
                        }}
                    >
                        {summary.maxAQI}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-wider">Top Pollutant</span>
                        <span className="text-slate-900 dark:text-white font-black text-lg">{summary.parameter}</span>
                    </div>
                </div>
            </div>

            {/* Health Recommendation Card */}
            <div className="premium-sidebar text-white rounded-[2rem] p-8 shadow-2xl hover:shadow-[0_20px_50px_rgba(11,61,145,0.3)] transition-all group relative overflow-hidden border border-white/10">
                <div className="absolute -right-10 -bottom-10 opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-700">
                    <Heart size={180} strokeWidth={1} />
                </div>
                <div className="flex items-center gap-5 mb-4 relative">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10">
                        <ShieldCheck size={24} className="text-sky-300" />
                    </div>
                    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-sky-200">Health Advisory</h3>
                </div>
                <p className="text-white/90 text-sm leading-relaxed font-bold relative italic pr-12">
                    "{getHealthTip(summary.category)}"
                </p>
                <div className="mt-6 flex items-center gap-3 text-[9px] text-sky-300/60 font-black uppercase tracking-[0.3em] relative">
                    <div className="w-8 h-px bg-sky-300/30"></div>
                    Stay Safe, Mississippi
                </div>
            </div>
        </div>
    );
}
