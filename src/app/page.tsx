"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DataService, AQIDataPoint } from '@/lib/data';
import { Activity, Clock, TrendingUp, CloudRain, Flame } from 'lucide-react';

// Dynamically import maps to avoid SSR issues with Leaflet
const AQIMap = dynamic(() => import('@/components/AQIMap'), { ssr: false, loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl border border-slate-200">Loading Interactive Map...</div> });
const BurnPermitsView = dynamic(() => import('@/components/BurnPermitsView'), { ssr: false, loading: () => <div className="h-[500px] w-full bg-slate-100 animate-pulse flex items-center justify-center rounded-xl border border-slate-200">Loading Burn Permits Dashboard...</div> });
// Import TrendsChart
import TrendsChart from '@/components/TrendsChart';
import ForecastView from '@/components/ForecastView';
import SummaryCards from '@/components/SummaryCards';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('current');
  const [data, setData] = useState<{ allData: AQIDataPoint[], parameters: string[], parameterData: Record<string, AQIDataPoint[]> } | null>(null);
  const [param, setParam] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statewideSummary, setStatewideSummary] = useState<any>(null);

  // Lock default date strictly to Mississippi Local Time (America/Chicago) to avoid evening UTC rollovers into 'tomorrow'
  // Default to Yesterday for historical as Today's daily averages won't exist yet
  const [historicalDate, setHistoricalDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  });

  useEffect(() => {
    // Reset state when switching tabs or dates to avoid data bleed
    // Don't clear EVERYTHING if we're just switching dates as it's jarring, 
    // but we need to clear data to show loading state if it's a different day
    setData(null);
    setParam('');
    setError('');

    if (activeTab === 'historical') {
      loadData(historicalDate);
    } else if (activeTab === 'current') {
      loadData();
    }
  }, [activeTab, historicalDate]);

  useEffect(() => {
    // Only auto-refresh current tab
    if (activeTab !== 'current') return;
    const interval = setInterval(() => loadData(), 10 * 60 * 1000); // 10 min refresh to match new cache
    return () => clearInterval(interval);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'current' && data?.allData) {
      const summary = DataService.getStatewideSummary(data.allData);
      setStatewideSummary(summary);
    } else {
      setStatewideSummary(null);
    }
  }, [data, activeTab]);

  const loadData = async (dateStr: string | null = null) => {
    try {
      setLoading(true);
      setError('');
      let response: any;
      if (dateStr) {
        response = await DataService.fetchHistoricalDailyNAAQS(dateStr);
      } else {
        response = await DataService.fetchAirQualityData();
      }

      if (response && response.allData && response.allData.length > 0) {
        setData(response);
        setError('');

        // Prioritize Ozone for current, or first available for historical
        const availableParams = response.parameters;
        if (availableParams.length > 0) {
          if (!param || !availableParams.includes(param)) {
            const defaultParam = availableParams.includes('OZONE') ? 'OZONE' : availableParams[0];
            setParam(defaultParam);
          }
        }
      } else {
        // If we tried to load but got nothing
        setError('No data points found for this selection. This may be due to a temporary AirNow service interruption.');
      }
    } catch (err: any) {
      console.error('Frontend Fetch Error:', err);
      setError('Unable to reach Air Quality servers. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { id: 'current', label: 'Current Air Quality', icon: Activity },
    { id: 'historical', label: 'Historical Data', icon: Clock },
    { id: 'trends', label: 'Historical Trends', icon: TrendingUp },
    { id: 'forecast', label: 'Air Quality Forecast', icon: CloudRain },
    { id: 'burn', label: 'MFC Burn Permits', icon: Flame },
  ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans text-slate-800">

      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-gradient-to-b from-[#0b3d91] to-[#1e3a8a] text-white p-6 shadow-xl z-10 flex flex-col">
        <div className="text-center mb-8">
          <a href="https://www.mdeq.ms.gov/" target="_blank" rel="noreferrer">
            <img src="/msdeq_logo.jpeg" alt="MDEQ Logo" className="w-20 rounded-xl mx-auto mb-4 shadow-lg bg-white p-1" />
          </a>
          <h1 className="font-bold text-lg tracking-tight">MS Air Quality</h1>
        </div>

        <nav className="flex flex-col gap-2 mb-auto overflow-x-auto md:overflow-visible">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm whitespace-nowrap
                  ${isActive ? 'bg-white/20 text-white shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}
              >
                <Icon size={18} className={isActive ? 'text-sky-300' : ''} suppressHydrationWarning />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-3 text-sm">
          <p className="text-white/50 font-semibold tracking-wider text-xs uppercase mb-1">Resources</p>
          <a href="https://www.airnow.gov/" target="_blank" className="text-white/80 hover:text-white hover:underline transition-colors">AirNow.gov</a>
          <a href="https://fire.airnow.gov/" target="_blank" className="text-white/80 hover:text-white hover:underline transition-colors">Fire & Smoke Map</a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0b3d91]">Mississippi Ambient Air Quality Dashboard</h2>
          <div className="bg-white px-5 py-2.5 rounded-full shadow-sm border border-slate-200 text-sm font-medium text-slate-600 flex items-center gap-2">
            <Clock size={16} className="text-sky-500" suppressHydrationWarning />
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </header>

        {/* Legend */}
        <div className="bg-white/80 backdrop-blur-md border border-white p-4 rounded-2xl shadow-sm mb-6 flex flex-wrap gap-4 items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#00e400] shadow-inner border border-black/10"></div>Good (0-50)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#ffff00] shadow-inner border border-black/10"></div>Moderate (51-100)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#ff7e00] shadow-inner border border-black/10"></div>USG (101-150)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#ff0000] shadow-inner border border-black/10"></div>Unhealthy (151-200)</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#99004c] shadow-inner border border-black/10"></div>Very Unhealthy</div>
          <div className="flex items-center gap-2"><div className="w-4 h-4 rounded bg-[#7e0023] shadow-inner border border-black/10"></div>Hazardous</div>
        </div>

        {/* Tab Content */}
        {(activeTab === 'current' || activeTab === 'historical') && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <label className="font-semibold text-slate-700">Parameter:</label>
                  <select
                    value={param}
                    onChange={(e) => setParam(e.target.value)}
                    className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium min-w-[120px]"
                    disabled={!data || data.parameters.length === 0}
                  >
                    {data?.parameters.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {activeTab === 'historical' && (
                  <div className="flex items-center gap-3 border-l border-slate-200 pl-6">
                    <label className="font-semibold text-slate-700">Select Date:</label>
                    <input
                      type="date"
                      value={historicalDate}
                      max={new Date().toISOString().split('T')[0]} // Cannot pick future
                      onChange={(e) => setHistoricalDate(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-900 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium"
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => activeTab === 'historical' ? loadData(historicalDate) : loadData()}
                className="bg-[#0b3d91] hover:bg-[#1e3a8a] text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
              >
                Refresh Data
              </button>
            </div>

            {loading && <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200"><div className="animate-spin w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full mx-auto mb-4"></div><p className="text-slate-500 font-medium tracking-wide">Fetching Air Quality Data...</p></div>}

            {error && <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-6 rounded-r-lg font-medium shadow-sm flex items-center gap-4">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-500">!</div>
              {error}
            </div>}

            {!loading && !error && (!data || !param) && (
              <div className="text-center p-12 bg-white rounded-2xl shadow-sm border border-slate-200">
                <p className="text-slate-500 font-medium">No Air Quality Data available for this selection.</p>
              </div>
            )}

            {!loading && !error && data && param && (
              <>
                {activeTab === 'current' && <SummaryCards summary={statewideSummary} />}

                <AQIMap data={data.parameterData[param] || []} parameter={param} />

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800">
                      {activeTab === 'current' ? 'Current Readings' : 'Historical Readings'} ({param})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-[#f8fafc] text-slate-500 font-semibold uppercase text-xs tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4">Site Location</th>
                          <th className="px-6 py-4">Observation Time</th>
                          <th className="px-6 py-4">Observed Value</th>
                          <th className="px-6 py-4">Units</th>
                          <th className="px-6 py-4">AQI Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(data.parameterData[param] || []).map((row, i) => {
                          const aqiInfo = DataService.getAQIInfo(param, row.value);
                          return (
                            <tr key={i} className="hover:bg-sky-50/30 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-700">{row.siteName}</td>
                              <td className="px-6 py-4 text-slate-500 font-medium">{row.time || '--'}</td>
                              <td className="px-6 py-4 text-lg font-bold text-slate-900">{row.value}</td>
                              <td className="px-6 py-4 text-slate-400 font-medium">{row.units}</td>
                              <td className="px-6 py-4">
                                <span
                                  className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold leading-none border shadow-sm"
                                  style={{
                                    backgroundColor: `${aqiInfo?.color}15`,
                                    color: aqiInfo?.color === '#ffff00' ? '#9a4700' : aqiInfo?.color,
                                    borderColor: `${aqiInfo?.color}40`
                                  }}
                                >
                                  <span className="w-2.5 h-2.5 rounded-full mr-2 shadow-inner" style={{ backgroundColor: aqiInfo?.color }}></span>
                                  {aqiInfo?.category}
                                </span>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Other Tabs */}
        {activeTab === 'burn' && (
          <BurnPermitsView />
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 mt-8">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center shadow-inner">
                <TrendingUp size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Historical Trends</h3>
                <p className="text-slate-500">10-Day regional lookback using AirNow datasets.</p>
              </div>
            </div>
            <TrendsChart />
          </div>
        )}

        {/* Forecast Tab */}
        {activeTab === 'forecast' && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in slide-in-from-bottom-4 mt-8">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
              <div className="w-16 h-16 bg-sky-50 text-sky-500 rounded-full flex items-center justify-center shadow-inner">
                <CloudRain size={28} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-800">Air Quality Forecast</h3>
                <p className="text-slate-500">Live 24-hour pollutant projections from AirNow.</p>
              </div>
            </div>
            <ForecastView />
          </div>
        )}

      </main>
    </div>
  );
}
