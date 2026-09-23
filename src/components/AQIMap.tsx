"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { AQIDataPoint, DataService } from '@/lib/data';

function PopupContent({ point, aqiInfo }: { point: AQIDataPoint, aqiInfo: { color: string; category: string } | undefined }) {
    return (
        <div className="text-center p-1 w-56">
            <h4 className="font-bold text-lg m-0 text-slate-800 dark:text-slate-100">{point.siteName}</h4>
            {point.time && <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Observed: {point.time}</div>}

            <div className="flex items-center justify-center gap-3 mt-2 bg-slate-50 dark:bg-slate-900 rounded-lg p-2 border border-slate-100 dark:border-slate-800/80">
                <div className="text-3xl font-black text-slate-800 dark:text-white">{point.aqi || point.value}{point.aqiEstimated ? '*' : ''}</div>
                <div className="text-left">
                    <div className="text-xs font-bold text-slate-500 dark:text-slate-400">AQI</div>
                    <div
                        className="px-2 py-0.5 rounded font-bold text-xs"
                        style={{ backgroundColor: aqiInfo?.color, color: ['Good', 'Moderate'].includes(aqiInfo?.category || '') ? '#000' : '#fff' }}
                    >
                        {aqiInfo?.category || 'No Data'}
                    </div>
                </div>
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 font-semibold">
                Concentration: {point.value} {point.units}
            </div>
            {point.aqiEstimated && (
                <div className="text-[10px] text-slate-400 mt-1">* Estimate: AirNow&apos;s NowCast AQI for this hour isn&apos;t published yet</div>
            )}
        </div>
    );
}

export default function AQIMap({ data }: { data: AQIDataPoint[] }) {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const checkTheme = () => {
            setIsDark(document.documentElement.classList.contains('dark'));
        };
        
        checkTheme();

        const observer = new MutationObserver(checkTheme);
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => observer.disconnect();
    }, []);

    const createCustomIcon = (point: AQIDataPoint) => {
        const aqiInfo = DataService.rowInfo(point);
        const bgColor = aqiInfo?.color || 'gray';
        const textColor = ['Good', 'Moderate'].includes(aqiInfo?.category || '') ? '#000' : '#fff';

        const html = `
      <div style="
        background-color: ${bgColor};
        color: ${textColor};
        width: 32px; height: 32px;
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        font-weight: bold; font-size: 11px;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        ${point.aqi || point.value}${point.aqiEstimated ? '*' : ''}
      </div>
    `;

        return L.divIcon({ html, className: 'custom-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
    };

    const tileUrl = isDark 
        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

    const attribution = isDark
        ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';

    return (
        <div className="h-[500px] w-full rounded-2xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-800 transition-all duration-300">
            <MapContainer center={[32.3547, -89.3985]} zoom={7} scrollWheelZoom={false} className="h-full w-full z-0 relative">
                <TileLayer
                    key={tileUrl} // Force re-render of TileLayer when theme URL changes!
                    attribution={attribution}
                    url={tileUrl}
                />
                {data.map((point, i) => {
                    if (!point.location) return null;

                    const aqiInfo: { color: string; category: string } | undefined = DataService.rowInfo(point);

                    return (
                        <Marker key={i} position={[point.location.lat, point.location.lng]} icon={createCustomIcon(point)}>
                            <Popup className="rounded-lg">
                                <PopupContent point={point} aqiInfo={aqiInfo} />
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
