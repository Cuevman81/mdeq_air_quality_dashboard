"use client";

import { useState, useEffect } from 'react';
import { DataService } from '@/lib/data';

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
        return 'bg-slate-200 text-slate-800';
    };

    return (
        <div className="w-full text-left space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center gap-4">
                <label className="font-semibold text-slate-700 whitespace-nowrap">Select Pollutant:</label>
                <select
                    value={pollutant}
                    onChange={(e) => setPollutant(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500 font-medium min-w-[150px]"
                >
                    <option value="O3">Ozone</option>
                    <option value="PM2.5">PM2.5</option>
                </select>
                {loading && <div className="text-sky-500 font-medium animate-pulse text-sm ml-auto flex items-center gap-2"><div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div> Fetching Forecasts...</div>}
            </div>

            <div className="bg-sky-50 border-l-4 border-sky-500 p-4 rounded-r-lg shadow-sm">
                <p className="font-medium text-slate-700 text-sm md:text-base">
                    <a href="https://www.enviroflash.info/signup.cfm" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-800 hover:underline font-bold">
                        Sign Up for Forecast Emails (EnviroFlash)
                    </a>
                </p>
                {pollutant === 'O3' && (
                    <p className="text-sm mt-2 text-slate-600">
                        <strong>Note:</strong> The Mississippi ozone monitoring and forecasting season runs from March 1st to October 31st. The Jackson NCORE site monitors for ozone year-round.
                    </p>
                )}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg font-medium shadow-sm flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 text-sm font-bold">!</div>
                    {error}
                </div>
            )}

            {!loading && !error && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-6">
                    {FORECAST_LOCATIONS.map(loc => {
                        const allLocForecasts = forecasts[loc.name] || [];
                        const filteredForecasts = allLocForecasts.filter((f: any) => f.ParameterName === pollutant);

                        if (filteredForecasts.length === 0) {
                            return (
                                <div key={loc.name} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center h-full flex flex-col justify-center min-h-[250px]">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{loc.name}</h3>
                                    <p className="text-slate-500">No {pollutant} forecast available.</p>
                                </div>
                            );
                        }

                        return (
                            <div key={loc.name} className="flex flex-col gap-4">
                                <h3 className="text-2xl font-bold tracking-tight border-b-2 border-slate-200 pb-2 text-slate-800">{loc.name}</h3>

                                {filteredForecasts.map((forecast: any, index: number) => {
                                    const categoryName = forecast.Category?.Name || 'Unknown';
                                    const styleClass = getCategoryStyles(categoryName);

                                    // Parse YYYY-MM-DD reliably without timezone shifts
                                    const [year, month, day] = forecast.DateForecast.split('-').map(Number);
                                    const dateObj = new Date(year, month - 1, day);
                                    const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

                                    return (
                                        <div key={index} className={`rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col transition-transform hover:scale-[1.02] ${styleClass}`}>
                                            <div className="flex justify-between items-baseline mb-2 border-b border-black/10 pb-2">
                                                <p className="text-lg font-bold">{formattedDate}</p>
                                                {forecast.AQI !== -1 && (
                                                    <p className="text-2xl font-black opacity-90 drop-shadow-sm">AQI: {forecast.AQI}</p>
                                                )}
                                            </div>

                                            <div className="space-y-3 flex-grow text-sm md:text-base mt-2">
                                                <p><strong>Category:</strong> {categoryName}</p>

                                                {AQI_CATEGORY_INFO[categoryName] && (
                                                    <p className="italic opacity-90 leading-snug">
                                                        {AQI_CATEGORY_INFO[categoryName]}
                                                    </p>
                                                )}

                                                {forecast.Discussion && (
                                                    <p className="pt-2 border-t border-black/10"><strong>Discussion:</strong> {forecast.Discussion}</p>
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
