"use client";

import { useState, useEffect } from 'react';
import { DataService } from '@/lib/data';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const MS_SITES = [
    "CLEVELAND",
    "GPORT YC",
    "Hattiesburg",
    "HERNANDO",
    "Hinds CC",
    "Jackson NCORE",
    "PASCAGOULA",
    "TUPELOAP",
    "WAVELAND"
];

export default function TrendsChart() {
    const [selectedArea, setSelectedArea] = useState<string>('');
    const [trendData, setTrendData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!selectedArea) {
            setTrendData([]);
            return;
        }

        const fetchTrends = async () => {
            setLoading(true);
            setError('');
            try {
                const data = await DataService.fetchTrendData();
                setTrendData(data.filter((d: any) => d.area === selectedArea));
            } catch (err: any) {
                setError('Failed to load historical trend data from AirNow.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchTrends();
    }, [selectedArea]);

    // Group data by parameter for multiple charts
    const parameters = Array.from(new Set(trendData.map(d => d.parameter))).sort();

    // We remove the hardcoded flat getAQIColor since concentration scales differ drastically per parameter.
    // Instead, we will map via DataService.getAQIInfo below.

    return (
        <div className="w-full text-left space-y-6">
            <div className="glass p-6 rounded-3xl shadow-lg border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-6 transition-all duration-500">
                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full max-w-lg">
                    <label className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">Source Monitoring Site:</label>
                    <div className="relative group w-full">
                        <select
                            value={selectedArea}
                            onChange={(e) => setSelectedArea(e.target.value)}
                            className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold w-full transition-all appearance-none cursor-pointer"
                        >
                            <option value="">-- Select Site for Trend --</option>
                            {MS_SITES.map(site => (
                                <option key={site} value={site}>{site}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                        </div>
                    </div>
                </div>
                {loading && <div className="text-primary font-black text-[10px] uppercase tracking-widest animate-pulse flex items-center gap-3"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div> Loading dataset...</div>}
            </div>

            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg font-medium shadow-sm flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500 text-sm font-bold">!</div>
                    {error}
                </div>
            )}

            {!loading && !error && selectedArea && trendData.length === 0 && (
                <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200 text-slate-500 font-medium">
                    No recent 10-day lookback data available for {selectedArea}.
                </div>
            )}

            {!loading && trendData.length > 0 && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 ease-out">
                    <div className="flex items-center gap-4 justify-center mb-8">
                        <div className="h-px grow bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800"></div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-900 px-6 py-2 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"></div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-[0.2em]">10-Day Historical Trend: {selectedArea}</h3>
                        </div>
                        <div className="h-px grow bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800"></div>
                    </div>

                    {parameters.map(param => {
                        const paramData = trendData.filter(d => d.parameter === param).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
                        const dates = paramData.map(d => new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }));
                        const values = paramData.map(d => d.value);
                        const colors = paramData.map(d => DataService.getAQIInfo(param, d.value)?.color || '#cccccc');

                        const chartData = {
                            labels: dates,
                            datasets: [{
                                label: param,
                                data: values,
                                backgroundColor: colors,
                                borderRadius: 8,
                                borderWidth: 0,
                                barThickness: 24,
                            }]
                        };

                        const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: {
                                    display: true,
                                    text: `${param} Concentrations`,
                                    font: { size: 14, weight: '900' as any, family: 'Inter' },
                                    color: 'gray',
                                    padding: { bottom: 20 },
                                    align: 'start' as any
                                },
                                tooltip: {
                                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                    titleFont: { size: 12, weight: 'bold' as any },
                                    bodyFont: { size: 12 },
                                    padding: 12,
                                    cornerRadius: 12,
                                    displayColors: false
                                }
                            },
                            scales: {
                                x: {
                                    grid: { display: false },
                                    ticks: { 
                                        font: { size: 10, weight: 'bold' as any },
                                        color: 'gray'
                                    }
                                },
                                y: {
                                    grid: { 
                                        color: 'rgba(156, 163, 175, 0.1)',
                                        drawBorder: false
                                    },
                                    ticks: {
                                        font: { size: 10, weight: 'bold' as any },
                                        color: 'gray'
                                    }
                                }
                            }
                        };

                        return (
                            <div key={param} className="glass-card p-10 transition-all duration-500 hover:shadow-2xl hover:scale-[1.01] border-slate-200/50 dark:border-slate-800/50">
                                <div className="h-[350px] w-full">
                                    <Bar data={chartData} options={options} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
