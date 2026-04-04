"use client";

import { useState, useEffect } from 'react';
import { DataService } from '@/lib/data';
import { Info, CloudRain } from 'lucide-react';

const FORECAST_LOCATIONS = [
    { name: "Hernando", zip: "38632" },
    { name: "Jackson", zip: "39201" },
    { name: "Gulf Coast", zip: "39501" }
];

const AQI_CATEGORY_INFO: Record<string, string> = {
    'Good': 'Air quality is satisfactory, and air pollution poses little or no risk.',
    'Moderate': 'Air quality is acceptable. However, there may be a risk for some people, particularly those who are unusually sensitive to air pollution.',
    'Unhealthy for Sensitive Groups': 'Members of sensitive groups may experience health effects. The general public is less likely to be affected.',
    'Unhealthy': 'Some members of the general public may experience health effects; members of sensitive groups may experience more serious health effects.',
    'Very Unhealthy': 'Health alert: The risk of health effects is increased for everyone.',
    'Hazardous': 'Health warning of emergency conditions: everyone is more likely to be affected.'
};

export default function ForecastView() {
    const [pollutant, setPollutant] = useState<string>('O3');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [forecasts, setForecasts] = useState<Record<string, any[]>>({});

    useEffect(() => {
        const fetchAllForecasts = async () => {
            setLoading(true);
            setError('');
            const results: Record<string, any[]> = {};
            try {
                for (const loc of FORECAST_LOCATIONS) {
                    const data = await DataService.fetchForecastData(loc.zip);
                    results[loc.name] = data;
                }
                setForecasts(results);
            } catch (err: any) {
                setError('Failed to load forecast data from AirNow API. Please try again later.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchAllForecasts();
    }, []);

    const getCategoryStyles = (categoryName: string) => {
        const cat = categoryName.toLowerCase();
        if (cat === 'good') return 'bg-[#00e400] text-slate-800';
        if (cat === 'moderate') return 'bg-[#ffff00] text-slate-800';
        if (cat === 'unhealthy for sensitive groups') return 'bg-[#ff7e00] text-white';
        if (cat === 'unhealthy') return 'bg-[#ff0000] text-white';
        if (cat === 'very unhealthy') return 'bg-[#99004c] text-white';
        if (cat === 'hazardous') return 'bg-[#7e0023] text-white';
        return 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200';
    };

    return (
        <div className="w-full text-left space-y-8">
            <div className="glass p-6 rounded-3xl shadow-lg border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-6 transition-all duration-500">
                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full max-w-lg">
                    <label className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">Target Pollutant:</label>
                    <div className="relative group w-full">
                        <select
                            value={pollutant}
                            onChange={(e) => setPollutant(e.target.value)}
                            className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold w-full transition-all appearance-none cursor-pointer"
                        >
                            <option value="O3">Ozone (O3)</option>
                            <option value="PM2.5">Particulate Matter (PM2.5)</option>
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                        </div>
                    </div>
                </div>
                {loading && <div className="text-primary font-black text-[10px] uppercase tracking-widest animate-pulse flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Fetching projections...</div>}
            </div>

            <div className="bg-primary/5 dark:bg-primary/10 border-l-4 border-primary p-6 rounded-2xl shadow-sm backdrop-blur-sm">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary mt-1">
                        <Info size={20} />
                    </div>
                    <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">
                            <a href="https://www.enviroflash.info/signup.cfm" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 transition-colors flex items-center gap-2">
                                Sign up for automated air quality alerts via EnviroFlash
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            </a>
                        </p>
                        {pollutant === 'O3' && (
                            <p className="text-sm mt-3 text-slate-500 dark:text-slate-400 leading-relaxed">
                                <span className="font-bold text-slate-700 dark:text-slate-300">Seasonal Alert:</span> The Mississippi ozone forecasting season is active from March 1st to October 31st. Regional monitoring ensures public safety during peak exposure months.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg font-medium shadow-sm flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 text-sm font-bold">!</div>
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out mt-8">
                    {FORECAST_LOCATIONS.map(loc => {
                        const allLocForecasts = forecasts[loc.name] || [];
                        const filteredForecasts = allLocForecasts.filter((f: any) => f.ParameterName === pollutant);

                        if (filteredForecasts.length === 0) {
                            return (
                                <div key={loc.name} className="glass rounded-[2rem] p-10 text-center h-full flex flex-col justify-center min-h-[300px] border-slate-200/50 dark:border-slate-800/50">
                                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
                                        <CloudRain size={32} />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-2">{loc.name}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 font-bold uppercase text-[10px] tracking-widest">No Forecast Data Available</p>
                                </div>
                            );
                        }

                        return (
                            <div key={loc.name} className="flex flex-col gap-6">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="h-0.5 grow bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800"></div>
                                    <h3 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">{loc.name}</h3>
                                    <div className="h-0.5 grow bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800"></div>
                                </div>

                                {filteredForecasts.map((forecast: any, index: number) => {
                                    const categoryName = forecast.Category?.Name || 'Unknown';
                                    const styleClass = getCategoryStyles(categoryName);

                                    const [year, month, day] = forecast.DateForecast.split('-').map(Number);
                                    const dateObj = new Date(year, month - 1, day);
                                    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                                    return (
                                        <div key={index} className={`rounded-[2rem] shadow-xl p-8 flex flex-col border border-white/20 dark:border-slate-800/20 transition-all duration-300 hover:scale-[1.03] group ${styleClass}`}>
                                            <div className="flex justify-between items-start mb-6 border-b border-black/10 pb-4">
                                                <div>
                                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Mississippi Forecast</p>
                                                    <p className="text-xl font-black">{formattedDate}</p>
                                                </div>
                                                {forecast.AQI !== -1 && (
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">AQI Index</p>
                                                        <p className="text-3xl font-black tabular-nums">{forecast.AQI}</p>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-4 flex-grow">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-3 h-3 rounded-full bg-white border border-black/10"></span>
                                                    <p className="text-lg font-black uppercase tracking-tight">{categoryName}</p>
                                                </div>

                                                {AQI_CATEGORY_INFO[categoryName] && (
                                                    <p className="text-sm font-bold leading-relaxed opacity-90 italic">
                                                        "{AQI_CATEGORY_INFO[categoryName]}"
                                                    </p>
                                                )}

                                                {forecast.Discussion && (
                                                    <div className="pt-5 mt-5 border-t border-black/10">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Technical Summary</p>
                                                        <p className="text-xs font-bold leading-relaxed">{forecast.Discussion}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
