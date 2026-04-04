"use client";

import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { Flame, MapPin, Maximize, AlertTriangle } from 'lucide-react';

interface BurnPermit {
    id: number;
    latitude: number;
    longitude: number;
    county: string;
    acres: number;
    type: string;
    purpose: string;
    dayNight: string;
    date: string;
}

export default function BurnPermitsView() {
    const [permits, setPermits] = useState<BurnPermit[]>([]);
    const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchPermits = async () => {
            setLoading(true);
            setError('');

            const [y, m, d] = selectedDate.split('-');
            const formattedQueryDate = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;

            try {
                const whereClause = `permit_date='${formattedQueryDate}'`;
                const url = `https://services5.arcgis.com/hE6urTTXj32LRUqx/arcgis/rest/services/MFC_Burn_Permit_Application_View_2/FeatureServer/0/query?where=${encodeURIComponent(whereClause)}&outFields=*&f=geojson&outSR=4326`;
                const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;

                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error('Failed to fetch permit data');
                const data = await response.json();

                if (!data.features) {
                    setPermits([]);
                    return;
                }

                const parsedPermits = data.features
                    .filter((f: any) => f.properties.latitude_dd && f.properties.longitude_dd)
                    .map((f: any) => ({
                        id: f.properties.objectid,
                        latitude: f.properties.latitude_dd,
                        longitude: f.properties.longitude_dd,
                        county: f.properties.county || 'Unknown',
                        acres: f.properties.burn_acres_estimate || 0,
                        type: f.properties.burn_type || 'Unknown Type',
                        purpose: f.properties.burn_purpose || 'Unknown Purpose',
                        dayNight: f.properties.day_night || 'Day',
                        date: f.properties.permit_date || 'Unknown'
                    }));

                setPermits(parsedPermits);
            } catch (err: any) {
                console.error("Failed to load MFC Burn Permits", err);
                setError("Unable to communicate with the Mississippi Forestry Commission servers.");
            } finally {
                setLoading(false);
            }
        };

        fetchPermits();
    }, [selectedDate]);

    const totalAcres = permits.reduce((sum, p) => sum + p.acres, 0);
    const topCountyData = Object.entries(permits.reduce((acc, p) => {
        acc[p.county] = (acc[p.county] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
    const topCounty = topCountyData.length > 0 ? topCountyData[0] : null;

    const createFireIcon = (type: string) => {
        const isForestry = type.includes('Forestry');
        const color = isForestry ? '#ea580c' : '#dc2626';
        const html = `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
            </div>
        `;
        return L.divIcon({ html, className: 'custom-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
    };

    if (loading) return (
        <div className="text-center p-20 glass rounded-[2.5rem] shadow-xl border-slate-200 dark:border-slate-800">
            <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-6"></div>
            <p className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.3em] text-xs">Synchronizing MFC Records...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">
            <div className="glass p-6 rounded-3xl shadow-lg border-slate-200/50 dark:border-slate-800/50 flex flex-wrap items-center justify-between gap-6">
                <div className="flex flex-col md:flex-row md:items-center gap-4 w-full">
                    <label className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">MFC Permit Database Date:</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl px-5 py-3 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold transition-all w-full md:w-64"
                    />
                </div>
            </div>

            {!loading && permits.length === 0 && !error && (
                <div className="bg-amber-500/10 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 p-8 rounded-3xl shadow-xl flex items-center gap-6 backdrop-blur-sm animate-in zoom-in-95 duration-500">
                    <div className="w-14 h-14 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-500 flex-shrink-0">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="font-black text-xl tracking-tight">Zero Active Permits Found</h4>
                        <p className="font-bold opacity-80 mt-1">There are no documented active burn permits across Mississippi for {selectedDate}.</p>
                    </div>
                </div>
            )}

            <div className={`grid grid-cols-1 md:grid-cols-3 gap-8 ${permits.length === 0 ? 'opacity-40 grayscale' : ''}`}>
                <div className="bg-gradient-to-br from-[#ea2e0c] via-[#ea580c] to-[#f97316] rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
                        <Flame size={180} strokeWidth={1} />
                    </div>
                    <h3 className="text-orange-100/60 font-black uppercase tracking-[0.2em] text-[10px] mb-2">Active Network Permits</h3>
                    <p className="text-6xl font-black mb-2 tabular-nums">{permits.length}</p>
                    <div className="flex items-center gap-2 text-xs font-bold text-orange-200">
                        <div className="w-2 h-2 rounded-full bg-orange-300 animate-ping"></div>
                        Live MFC Data Feed
                    </div>
                </div>

                <div className="glass-card p-8 group relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-slate-500/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-800 group-hover:text-primary transition-colors">
                            <Maximize size={24} />
                        </div>
                        <h3 className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Total Impact Area</h3>
                    </div>
                    <div className="flex items-baseline gap-3">
                        <p className="text-4xl font-black text-slate-900 dark:text-white tabular-nums">{totalAcres.toLocaleString()}</p>
                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest">Acres</span>
                    </div>
                </div>

                <div className="glass-card p-8 group relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute -right-8 -top-8 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center gap-4 mb-3">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl border border-slate-200 dark:border-slate-800 group-hover:text-primary transition-colors">
                            <MapPin size={24} />
                        </div>
                        <h3 className="text-slate-400 dark:text-slate-500 font-black uppercase tracking-[0.2em] text-[10px]">Highest Activity</h3>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-900 dark:text-white truncate max-w-[200px]">{topCounty ? topCounty[0] : 'None'}</p>
                        {topCounty && <p className="text-xs font-black text-primary mt-1 uppercase tracking-[0.2em]">{topCounty[1]} Active Permits</p>}
                    </div>
                </div>
            </div>

            <div className="glass rounded-[2.5rem] shadow-2xl overflow-hidden border-slate-200 dark:border-slate-800">
                <div className="px-8 py-5 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="font-extrabold text-xl text-slate-800 dark:text-white flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]"></div>
                        Live Spatial Distribution
                    </h3>
                </div>
                <div className="h-[650px] w-full relative z-0">
                    <MapContainer center={[32.7, -89.6]} zoom={7.2} scrollWheelZoom={false} className="h-full w-full">
                        <TileLayer
                            attribution='&copy; OpenStreetMap | Data: Mississippi Forestry Commission'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {permits.map((permit) => (
                            <Marker key={permit.id} position={[permit.latitude, permit.longitude]} icon={createFireIcon(permit.type)}>
                                <Popup className="premium-popup">
                                    <div className="p-3 min-w-[240px]">
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                                            <div className="flex items-center gap-2">
                                                <Flame className="w-5 h-5 text-orange-600" />
                                                <h4 className="font-black text-lg m-0 text-slate-900 uppercase tracking-tight">{permit.county}</h4>
                                            </div>
                                            <div className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${permit.dayNight === 'Day' ? 'bg-sky-100 text-sky-700' : 'bg-slate-900 text-white'}`}>
                                                {permit.dayNight}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Burn Area:</span>
                                                <span className="font-black text-lg text-slate-900 tabular-nums">{permit.acres} <span className="text-[10px] uppercase">Acres</span></span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Permit Class:</span>
                                                <span className="font-bold text-sm text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg block">{permit.type}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Declared Purpose:</span>
                                                <p className="text-xs font-bold text-slate-600 italic leading-relaxed">"{permit.purpose}"</p>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            <div className="glass rounded-[2rem] shadow-xl overflow-hidden border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] border-b border-slate-200/50 dark:border-slate-800/50">
                            <tr>
                                <th className="px-8 py-5">Origin County</th>
                                <th className="px-8 py-5">Estimated Acres</th>
                                <th className="px-8 py-5">Classification</th>
                                <th className="px-8 py-5">Primary Purpose</th>
                                <th className="px-8 py-5 text-right">Schedule</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-bold">
                            {permits.map(permit => (
                                <tr key={permit.id} className="group hover:bg-orange-500/5 transition-colors duration-200">
                                    <td className="px-8 py-5 text-slate-800 dark:text-slate-200 group-hover:text-orange-600 transition-colors">{permit.county}</td>
                                    <td className="px-8 py-5 text-slate-900 dark:text-white tabular-nums">{permit.acres.toLocaleString()}</td>
                                    <td className="px-8 py-5 text-slate-500 dark:text-slate-400 text-xs">{permit.type}</td>
                                    <td className="px-8 py-5 text-slate-500 dark:text-slate-400 italic text-xs max-w-[200px] truncate">{permit.purpose}</td>
                                    <td className="px-8 py-5 text-right">
                                        <span className={`inline-block px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${permit.dayNight === 'Day' ? 'bg-sky-100/50 text-sky-700 dark:bg-sky-900/30' : 'bg-slate-900 text-slate-50 dark:bg-slate-200 dark:text-slate-900'}`}>
                                            {permit.dayNight}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
