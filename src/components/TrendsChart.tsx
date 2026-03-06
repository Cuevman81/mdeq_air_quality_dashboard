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
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full max-w-sm">
                    <label className="font-semibold text-slate-700 whitespace-nowrap">Reporting Area:</label>
                    <select
                        value={selectedArea}
                        onChange={(e) => setSelectedArea(e.target.value)}
                        className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium w-full"
                    >
                        <option value="">--Select an individual site--</option>
                        {MS_SITES.map(site => (
                            <option key={site} value={site}>{site}</option>
                        ))}
                    </select>
                </div>
                {loading && <div className="text-sky-500 font-medium animate-pulse text-sm flex items-center gap-2"><div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div> Loading...</div>}
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
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <h3 className="text-xl font-bold text-slate-800 text-center mb-6">10-Day Historical Lookback: {selectedArea}</h3>

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
                                borderRadius: 4,
                                borderWidth: 1,
                                borderColor: colors.map((c: string) => c === '#ffff00' ? '#d4b500' : c) // Slight border for yellow
                            }]
                        };

                        const options = {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                title: {
                                    display: true,
                                    text: `${param} Levels`,
                                    font: { size: 16, weight: 'bold' as any },
                                    color: '#475569'
                                }
                            },
                        };

                        return (
                            <div key={param} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                                <div className="h-[300px] w-full">
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
