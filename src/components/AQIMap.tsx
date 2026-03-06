"use client";

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { AQIDataPoint, DataService } from '@/lib/data';

// Isolated Component to manage the Popup's content when a marker is clicked

// Isolated Component to manage the Popup's dedicated fetching lifecycle when a marker is clicked
function PopupContent({ point, parameter, aqiInfo }: { point: AQIDataPoint, parameter: string, aqiInfo: any }) {
    return (
        <div className="text-center p-1 w-56">
            <h4 className="font-bold text-lg m-0 text-slate-800">{point.siteName}</h4>
            {point.time && <div className="text-xs text-slate-500 mb-1 font-medium">Observed: {point.time}</div>}

            <div className="flex items-center justify-center gap-3 mt-2 bg-slate-50 rounded-lg p-2 border border-slate-100">
                <div className="text-3xl font-black text-slate-800">{point.value}</div>
                <div className="text-left">
                    <div className="text-xs font-bold text-slate-500">{point.units}</div>
                    <div
                        className="px-2 py-0.5 rounded font-bold text-xs"
                        style={{ backgroundColor: aqiInfo?.color, color: ['Good', 'Moderate'].includes(aqiInfo?.category || '') ? '#000' : '#fff' }}
                    >
                        {aqiInfo?.category || 'No Data'}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AQIMap({ data, parameter }: { data: AQIDataPoint[], parameter: string }) {
    const bounds: [number, number][] = [];

    const createCustomIcon = (point: AQIDataPoint) => {
        const aqiInfo = DataService.getAQIInfo(parameter, point.value);
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
        ${point.value}
      </div>
    `;

        return L.divIcon({ html, className: 'custom-icon', iconSize: [32, 32], iconAnchor: [16, 16] });
    };

    return (
        <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-lg border border-slate-200">
            <MapContainer center={[32.3547, -89.3985]} zoom={7} scrollWheelZoom={false} className="h-full w-full z-0 relative">
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {data.map((point, i) => {
                    if (!point.location) return null;
                    bounds.push([point.location.lat, point.location.lng]);

                    const aqiInfo = DataService.getAQIInfo(parameter, point.value);

                    return (
                        <Marker key={i} position={[point.location.lat, point.location.lng]} icon={createCustomIcon(point)}>
                            <Popup className="rounded-lg">
                                <PopupContent point={point} parameter={parameter} aqiInfo={aqiInfo} />
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
