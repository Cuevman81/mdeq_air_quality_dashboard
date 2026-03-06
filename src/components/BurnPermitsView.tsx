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

            // Format date for MFC Backend (MM/DD/YYYY)
            const [y, m, d] = selectedDate.split('-');
            const formattedQueryDate = `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}`;

            try {
                // Safely inject the permit_date filter into the SQL WHERE clause to avoid the server's 2000-record truncation limit
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

    // Optional Auto-Fallback State
    // This state is no longer needed as the API now filters by date directly.
    // const [autoAdjusted, setAutoAdjusted] = useState(false);

    // Derived Statistics
    const totalAcres = permits.reduce((sum, p) => sum + p.acres, 0);
    const permitTypes = permits.reduce((acc, p) => {
        acc[p.type] = (acc[p.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const topCountyData = Object.entries(permits.reduce((acc, p) => {
        acc[p.county] = (acc[p.county] || 0) + 1;
        return acc;
    }, {} as Record<string, number>)).sort((a, b) => b[1] - a[1]);
    const topCounty = topCountyData.length > 0 ? topCountyData[0] : null;

    const createFireIcon = (type: string) => {
        const isForestry = type.includes('Forestry');
        const color = isForestry ? '#ea580c' : '#dc2626'; // orange-600 vs red-600
        const html = `
            <div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
            </div>
        `;
        return L.divIcon({ html, className: 'custom-icon', iconSize: [24, 24], iconAnchor: [12, 12] });
    };

    if (loading) return <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200"><div className="animate-spin w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-500 font-medium tracking-wide">Fetching Live Forest Fire Data...</p></div>;
    if (error) return <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg font-medium shadow-sm">{error}</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Controls */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full justify-between">
                    <div className="flex items-center gap-3 w-full max-w-sm">
                        <label className="font-semibold text-slate-700 whitespace-nowrap">View Permits For:</label>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500 font-medium w-full"
                        />
                    </div>
                </div>
            </div>

            {!loading && permits.length === 0 && !error && (
                <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-6 rounded-r-lg shadow-sm flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-amber-500 flex-shrink-0" />
                    <div>
                        <h4 className="font-bold text-lg">No Burn Permits Found</h4>
                        <p className="font-medium opacity-90">There are no documented active burn permits across Mississippi for {selectedDate}.</p>
                    </div>
                </div>
            )}

            {/* Top Summaries */}
            <div className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${permits.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <Flame className="absolute right-[-20px] top-[-20px] w-32 h-32 opacity-20 text-white" />
                    <h3 className="text-orange-100 font-medium uppercase tracking-wider text-sm mb-1">Active Permits</h3>
                    <p className="text-5xl font-black mb-1">{permits.length}</p>
                    <p className="text-sm font-medium text-orange-100">Across Mississippi</p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><Maximize className="w-5 h-5" /></div>
                        <h3 className="text-slate-500 font-medium uppercase tracking-wider text-sm">Total Area Burning</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{totalAcres.toLocaleString()} <span className="text-xl font-semibold text-slate-400">Acres</span></p>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><AlertTriangle className="w-5 h-5" /></div>
                        <h3 className="text-slate-500 font-medium uppercase tracking-wider text-sm">Highest Activity</h3>
                    </div>
                    <p className="text-3xl font-black text-slate-800">{topCounty ? topCounty[0] : 'N/A'}</p>
                    <p className="text-sm font-medium text-slate-500">{topCounty ? `${topCounty[1]} Permits` : ''}</p>
                </div>
            </div>

            {/* Interactive Map */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-500" />
                        Live Burn Permit Map
                    </h3>
                </div>
                <div className="h-[600px] w-full relative z-0">
                    <MapContainer center={[32.3547, -89.3985]} zoom={7} scrollWheelZoom={false} className="h-full w-full">
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Data: MFC'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        {permits.map((permit) => (
                            <Marker key={permit.id} position={[permit.latitude, permit.longitude]} icon={createFireIcon(permit.type)}>
                                <Popup className="rounded-lg min-w-[200px]">
                                    <div className="p-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Flame className="w-4 h-4 text-orange-500" />
                                            <h4 className="font-bold text-base m-0 text-slate-800">{permit.county} County</h4>
                                        </div>

                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                                <span className="text-slate-500">Size:</span>
                                                <span className="font-bold">{permit.acres} Acres</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                                <span className="text-slate-500">Type:</span>
                                                <span className="font-medium">{permit.type}</span>
                                            </div>
                                            <div className="flex justify-between border-b border-slate-100 pb-1">
                                                <span className="text-slate-500">Purpose:</span>
                                                <span className="font-medium text-right max-w-[120px] truncate" title={permit.purpose}>{permit.purpose}</span>
                                            </div>
                                            <div className="flex justify-between pb-1">
                                                <span className="text-slate-500">Shift:</span>
                                                <span className="font-medium">{permit.dayNight}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        ))}
                    </MapContainer>
                </div>
            </div>

            {/* Raw Data Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-[#f8fafc] text-slate-500 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4">County</th>
                                <th className="px-6 py-4">Acres</th>
                                <th className="px-6 py-4">Burn Type</th>
                                <th className="px-6 py-4">Purpose</th>
                                <th className="px-6 py-4">Shift</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {permits.map(permit => (
                                <tr key={permit.id} className="hover:bg-orange-50/30 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-700">{permit.county}</td>
                                    <td className="px-6 py-4 text-slate-900 font-bold">{permit.acres}</td>
                                    <td className="px-6 py-4 text-slate-600">{permit.type}</td>
                                    <td className="px-6 py-4 text-slate-600">{permit.purpose}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${permit.dayNight === 'Day' ? 'bg-sky-100 text-sky-700' : 'bg-slate-800 text-slate-100'}`}>
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
