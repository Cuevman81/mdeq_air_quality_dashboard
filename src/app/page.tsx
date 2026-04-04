"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { DataService, AQIDataPoint } from '@/lib/data';
import { Activity, Clock, TrendingUp, CloudRain, Flame, Filter } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

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
  const [legendFilter, setLegendFilter] = useState<string[]>([]);

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
      <aside className="w-full md:w-64 premium-sidebar text-white p-6 shadow-xl z-20 flex flex-col">
        <div className="text-center mb-10">
          <a href="https://www.mdeq.ms.gov/" target="_blank" rel="noreferrer" className="block transform hover:scale-105 transition-transform duration-300">
            <img src="/msdeq_logo.jpeg" alt="MDEQ Logo" className="w-20 rounded-2xl mx-auto mb-4 shadow-2xl bg-white p-1.5" />
          </a>
          <h1 className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-sky-200">MS Air Quality</h1>
          <p className="text-[10px] uppercase tracking-widest text-sky-300/60 font-bold mt-1">Real-time Dashboard</p>
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

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col gap-4 text-sm">
          <p className="text-white/40 font-bold tracking-widest text-[10px] uppercase mb-1">External Resources</p>
          <a href="https://www.airnow.gov/" target="_blank" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 group-hover:scale-125 transition-transform"></span>
            AirNow.gov
          </a>
          <a href="https://fire.airnow.gov/" target="_blank" className="flex items-center gap-2 text-white/70 hover:text-white transition-colors group">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 group-hover:scale-125 transition-transform"></span>
            Fire & Smoke Map
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">

        {/* Header */}
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
          <div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Mississippi <span className="text-primary">Ambient Air</span> Quality
            </h2>
            <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Live environmental data from the MDEQ Monitoring Network.</p>
          </div>
          <div className="flex items-center gap-4 w-full lg:w-auto">
            <div className="glass px-6 py-3 rounded-2xl text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-4 shadow-xl border-slate-200/50 dark:border-slate-800/50 grow lg:grow-0 justify-center group divide-x divide-slate-200 dark:divide-slate-800">
              <div className="flex items-center gap-3 pr-4">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]"></div>
                <span className="uppercase tracking-[0.2em] text-primary">Live</span>
              </div>
              <div className="flex items-center gap-3 pl-4">
                <Clock size={16} className="text-slate-400 group-hover:text-primary transition-colors" suppressHydrationWarning />
                <span className="uppercase tracking-widest tabular-nums">
                  {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Legend */}
        <div className="glass p-5 rounded-2xl mb-8 flex flex-wrap gap-6 items-center justify-between text-[11px] font-bold tracking-wide uppercase">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mr-2">
             <Filter size={14} className="text-primary" />
             <span>Filter by Status:</span>
          </div>
          {[
            { cat: 'Good', color: '#00e400' },
            { cat: 'Moderate', color: '#ffff00' },
            { cat: 'USG', color: '#ff7e00' },
            { cat: 'Unhealthy', color: '#ff0000' },
            { cat: 'Very Unhealthy', color: '#99004c' },
            { cat: 'Hazardous', color: '#7e0023' }
          ].map(level => {
            const isExcluded = legendFilter.includes(level.cat);
            return (
              <button
                key={level.cat}
                onClick={() => setLegendFilter(prev => prev.includes(level.cat) ? prev.filter(c => c !== level.cat) : [...prev, level.cat])}
                className={`flex items-center gap-2 transition-all duration-300 py-1.5 px-3 rounded-full border ${isExcluded ? 'opacity-30 grayscale' : 'opacity-100 shadow-sm'}`}
                style={{ borderColor: level.color + '40', backgroundColor: !isExcluded ? level.color + '10' : 'transparent' }}
              >
                <div className="w-3 h-3 rounded-full shadow-inner" style={{ backgroundColor: level.color }}></div>
                <span className={isExcluded ? 'text-slate-400' : 'text-slate-700 dark:text-slate-200'}>{level.cat}</span>
              </button>
            )
          })}
          <button 
            onClick={() => setLegendFilter([])}
            className={`text-[10px] text-primary hover:underline ml-auto ${legendFilter.length === 0 ? 'invisible' : 'visible'}`}
          >
            Clear Filters
          </button>
        </div>

        {/* Tab Content */}
        {(activeTab === 'current' || activeTab === 'historical') && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 ease-out">

            <div className="glass p-6 rounded-3xl shadow-lg flex flex-wrap items-center justify-between gap-6 border-slate-200/50 dark:border-slate-800/50">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-4">
                  <label className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">Pollutant:</label>
                  <select
                    value={param}
                    onChange={(e) => setParam(e.target.value)}
                    className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold text-sm min-w-[140px] transition-all cursor-pointer"
                    disabled={!data || data.parameters.length === 0}
                  >
                    {data?.parameters.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                {activeTab === 'historical' && (
                  <div className="flex items-center gap-4 border-l border-slate-200 dark:border-slate-800 pl-6">
                    <label className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 whitespace-nowrap">Reference Date:</label>
                    <input
                      type="date"
                      value={historicalDate}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => setHistoricalDate(e.target.value)}
                      className="bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white rounded-xl px-4 py-2.5 outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary font-bold text-sm transition-all"
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
              <div className="text-center p-16 glass rounded-3xl border-slate-200 dark:border-slate-800">
                <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">No data available for this selection.</p>
              </div>
            )}

            {!loading && !error && data && param && (
              <>
                {activeTab === 'current' && <SummaryCards summary={statewideSummary} />}

                <AQIMap 
                  data={(data.parameterData[param] || []).filter(p => !legendFilter.includes(DataService.getAQIInfo(param, p.value)?.category || ''))} 
                  parameter={param} 
                />

                <div className="glass rounded-3xl shadow-xl overflow-hidden border-slate-200 dark:border-slate-800">
                  <div className="px-8 py-5 border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center">
                    <h3 className="font-extrabold text-xl text-slate-800 dark:text-white">
                      {activeTab === 'current' ? 'Live Network Readings' : 'Daily NAAQS Compliance'} ({param})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em] border-b border-slate-200/50 dark:border-slate-800/50">
                        <tr>
                          <th className="px-8 py-5">Monitoring Site</th>
                          <th className="px-8 py-5">Observation</th>
                          <th className="px-8 py-5 text-right">Value</th>
                          <th className="px-3 py-5">Units</th>
                          <th className="px-8 py-5">AQI Descriptor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {(data.parameterData[param] || [])
                          .filter(row => {
                            const aqiInfo = DataService.getAQIInfo(param, row.value);
                            return !legendFilter.includes(aqiInfo?.category || '');
                          })
                          .map((row, i) => {
                            const aqiInfo = DataService.getAQIInfo(param, row.value);
                            return (
                              <tr key={i} className="group hover:bg-primary/5 transition-colors duration-200">
                                <td className="px-8 py-5 font-bold text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors">{row.siteName}</td>
                                <td className="px-8 py-5 text-slate-500 dark:text-slate-400 font-medium">{row.time || '--'}</td>
                                <td className="px-8 py-5 text-xl font-black text-slate-900 dark:text-white text-right tabular-nums">{row.value}</td>
                                <td className="px-3 py-5 text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{row.units}</td>
                                <td className="px-8 py-5">
                                  <span
                                    className="inline-flex items-center px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase border shadow-sm transition-transform group-hover:scale-105"
                                    style={{
                                      backgroundColor: `${aqiInfo?.color}15`,
                                      color: aqiInfo?.color === '#ffff00' ? '#9a4700' : aqiInfo?.color,
                                      borderColor: `${aqiInfo?.color}30`
                                    }}
                                  >
                                    <span className="w-2.5 h-2.5 rounded-full mr-2.5 shadow-lg border border-white/20" style={{ backgroundColor: aqiInfo?.color }}></span>
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
