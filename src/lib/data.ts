export const CONFIG = {
    sites: {
        'CLEVELAND': { lat: 33.7508, lng: -90.7342 },
        'GPORT YC': { lat: 30.3901, lng: -89.0497 },
        'Hattiesburg': { lat: 31.3240, lng: -89.2922 },
        'HERNANDO': { lat: 34.8206, lng: -89.9878 },
        'Hinds CC': { lat: 32.3467, lng: -90.2258 },
        'MERIDIAN': { lat: 32.3643, lng: -88.7314 },
        'Jackson NCORE': { lat: 32.3290, lng: -90.1827 },
        'PASCAGOULA': { lat: 30.3781, lng: -88.5339 },
        'TUPELOAP': { lat: 34.2648, lng: -88.7668 },
        'WAVELAND': { lat: 30.3009, lng: -89.3960 },
    },
    aqiThresholds: {
        'PM2.5': [
            { max: 9.0, category: 'Good', color: '#00e400', class: 'good' },
            { max: 35.4, category: 'Moderate', color: '#ffff00', class: 'moderate' },
            { max: 55.4, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'usg' },
            { max: 150.4, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
            { max: 250.4, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
            { max: Infinity, category: 'Hazardous', color: '#7e0023', class: 'hazardous' }
        ],
        'OZONE': [
            { max: 54, category: 'Good', color: '#00e400', class: 'good' },
            { max: 70, category: 'Moderate', color: '#ffff00', class: 'moderate' },
            { max: 85, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'usg' },
            { max: 105, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
            { max: 200, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
            { max: Infinity, category: 'Hazardous', color: '#7e0023', class: 'hazardous' }
        ]
    }
};

export interface AQIDataPoint {
    siteName: string;
    parameter: string;
    units: string;
    value: number;
    aqi: string;
    aqiCategory: string;
    location: { lat: number; lng: number } | null;
    date?: string;
    time?: string;
}

export class DataService {
    // We no longer use a static cache for the anchor to ensure we always try for the freshest data first

    static getAQIInfo(parameter: string, value: number) {
        // Strip out the custom aggregation suffixes to map to the core configuration metric (e.g. OZONE-8HR MAX -> OZONE)
        const cleanParam = parameter.split('-')[0];

        // @ts-ignore
        const thresholds = CONFIG.aqiThresholds[cleanParam] || [
            { max: 50, category: 'Good', color: '#00e400', class: 'good' },
            { max: 100, category: 'Moderate', color: '#ffff00', class: 'moderate' },
            { max: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'usg' },
            { max: 200, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
            { max: 300, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
            { max: Infinity, category: 'Hazardous', color: '#7e0023', class: 'hazardous' }
        ];
        return thresholds.find((t: any) => value <= t.max);
    }

    static getHourlyDataUrl(dateStr?: string, absoluteOffset = 0) {
        let s3Url = '';
        const now = new Date();
        const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const utcTodayStr = now.toISOString().split('T')[0];

        // If no date provided, or it matches local today OR UTC today, treat as current fetching logic
        if (!dateStr || dateStr === localTodayStr || dateStr === utcTodayStr) {
            const targetDate = new Date();
            // absoluteOffset is the number of hours to go back from NOW
            targetDate.setUTCHours(targetDate.getUTCHours() - absoluteOffset);

            const year = targetDate.getUTCFullYear();
            const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getUTCDate()).padStart(2, '0');
            const hour = String(targetDate.getUTCHours()).padStart(2, '0');

            s3Url = `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/today/HourlyData_${year}${month}${day}${hour}.dat`;
            // Add cache buster for real-time search
            return `/api/proxy?url=${encodeURIComponent(s3Url)}&cb=${Date.now()}`;
        } else {
            const [y, m, d] = dateStr.split('-');
            const hour = String(23 - absoluteOffset).padStart(2, '0'); 
            s3Url = `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/${y}/${y}${m}${d}/HourlyData_${y}${m}${d}${hour}.dat`;
            return `/api/proxy?url=${encodeURIComponent(s3Url)}`;
        }
    }

    static parseDatFile(content: string) {
        const lines = content.split('\n');
        const mssites: AQIDataPoint[] = [];
        const parameters = new Set<string>();
        const parameterData: Record<string, AQIDataPoint[]> = {};

        lines.forEach(line => {
            if (!line.trim()) return;
            const parts = line.split('|');

            // The file format has changed or differs from expectations. 
            // Instead of checking for 'MS' at index 6, we'll check if the siteName (index 3) is in our CONFIG dictionary
            // or if the reporting agency (index 8) is 'Mississippi DEQ'.

            if (parts.length >= 8) {
                let obsDate = parts[0]; // e.g., 03/04/26
                let obsTime = parts[1]; // e.g., 15:00

                // Convert UTC to LST (America/Chicago)
                try {
                    // Assuming format MM/DD/YY and HH:MM
                    const [m, d, yStr] = obsDate.split('/');
                    const year = yStr.length === 2 ? `20${yStr}` : yStr;
                    const cleanTime = obsTime.includes(':') ? obsTime : `${obsTime}:00`;

                    // Create UTC Date ISO string
                    const utcDateString = `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${cleanTime.padStart(5, '0')}:00Z`;
                    const dateObj = new Date(utcDateString);

                    if (!isNaN(dateObj.getTime())) {
                        obsDate = dateObj.toLocaleDateString('en-US', { timeZone: 'America/Chicago', month: '2-digit', day: '2-digit', year: '2-digit' });
                        obsTime = dateObj.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: '2-digit', minute: '2-digit', hour12: true, timeZoneName: 'short' });
                    }
                } catch (e) {
                    // Fallback to raw if parsing fails
                }

                const siteName = parts[3];
                const parameter = parts[5];
                const units = parts[6];
                const value = parseFloat(parts[7]);

                // Calculate AQI category from thresholds since index 8 is usually Agency name
                const aqiInfo = this.getAQIInfo(parameter, value);
                const aqiValue = aqiInfo ? String(Math.round(value)) : '';
                const category = aqiInfo?.category || '';

                const mappedSiteName = Object.keys(CONFIG.sites).find(
                    k => k.toLowerCase() === siteName.toLowerCase()
                ) || siteName;

                const location = CONFIG.sites[mappedSiteName as keyof typeof CONFIG.sites];
                const isMississippi = location || (parts.length > 8 && parts[8].includes('Mississippi'));

                if (isMississippi && siteName && parameter && !isNaN(value)) {
                    if (mappedSiteName === 'Jackson NCORE' && parameter === 'RWD') return;

                    const dataPoint = { siteName: mappedSiteName, parameter, units, value, aqi: aqiValue, aqiCategory: category, location: location || null, date: obsDate, time: obsTime };

                    mssites.push(dataPoint);
                    parameters.add(parameter);
                    if (!parameterData[parameter]) parameterData[parameter] = [];
                    parameterData[parameter].push(dataPoint);
                }
            }
        });

        // Ensure results are sorted by time descending (freshest at index 0)
        mssites.sort((a, b) => {
          try {
            const da = new Date(`${a.date} ${a.time}`).getTime();
            const db = new Date(`${b.date} ${b.time}`).getTime();
            return db - da;
          } catch (e) { return 0; }
        });

        return { allData: mssites, parameters: Array.from(parameters).sort(), parameterData };
    }

    static getStatewideSummary(allData: AQIDataPoint[]) {
        if (!allData || allData.length === 0) return null;

        const severityRank: Record<string, number> = {
            'Good': 1,
            'Moderate': 2,
            'Unhealthy for Sensitive Groups': 3,
            'Unhealthy': 4,
            'Very Unhealthy': 5,
            'Hazardous': 6,
            'Unknown': 0
        };

        let maxRank = 0;
        let maxValue = -1;

        // First find the threshold for the "worst" current conditions
        allData.forEach(p => {
            const info = this.getAQIInfo(p.parameter, p.value);
            const category = info?.category || 'Unknown';
            const rank = severityRank[category] || 0;

            if (rank > maxRank) {
                maxRank = rank;
                maxValue = p.value;
            } else if (rank === maxRank && p.value > maxValue) {
                maxValue = p.value;
            }
        });

        // Collect all sites that hit both the max rank AND the max value
        const tiedSites = allData.filter(p => {
            const info = this.getAQIInfo(p.parameter, p.value);
            const rank = severityRank[info?.category || 'Unknown'] || 0;
            return rank === maxRank && p.value === maxValue;
        });

        // Distinct site names
        const hotspotNames = Array.from(new Set(tiedSites.map(s => s.siteName)));
        const primaryPoint = tiedSites[0];
        const finalInfo = this.getAQIInfo(primaryPoint.parameter, primaryPoint.value);

        return {
            maxAQI: maxValue,
            hotspotSite: hotspotNames[0], // Backward compatibility
            hotspotSites: hotspotNames,
            category: finalInfo?.category || 'Unknown',
            color: finalInfo?.color || '#cbd5e1',
            parameter: primaryPoint.parameter
        };
    }

    static async fetchAirQualityData(dateStr: string | null = null, absoluteOffset = 0): Promise<any> {
        // Limit search to 6 hours to avoid infinite loops during outages
        if (absoluteOffset > 6) {
            throw new Error(`AirNow search exhausted. No network data found for the last 6 hours.`);
        }

        const url = this.getHourlyDataUrl(dateStr || undefined, absoluteOffset);

        try {
            console.log(`SmartHour Fetch: ${url} (Offset: ${absoluteOffset})`);
            const response = await fetch(url);

            if (response.ok) {
                const text = await response.text();
                const parsed = this.parseDatFile(text);

                // Case: File exists but MDEQ data hasn't been appended yet (Top of Hour)
                if (parsed.allData.length === 0) {
                    console.log(`Hour ${absoluteOffset} file found but empty. Rolling back...`);
                    return this.fetchAirQualityData(dateStr, absoluteOffset + 1);
                }

                return parsed;
            }

            // Case: File doesn't exist yet (404)
            if (response.status === 404) {
                console.log(`Hour ${absoluteOffset} not published yet. Trying previous hour...`);
                return this.fetchAirQualityData(dateStr, absoluteOffset + 1);
            }

            throw new Error(`Unexpected server response: ${response.status}`);
        } catch (error: any) {
            if (error.message.includes('exhausted')) throw error;
            console.warn(`Network error at offset ${absoluteOffset}, searching back...`, error);
            return this.fetchAirQualityData(dateStr, absoluteOffset + 1);
        }
    }

    static async fetchTrailingHourlyData(siteName: string, parameter: string, hoursBack: number = 12): Promise<{ time: string, value: number }[]> {
        console.log(`Fetching trailing ${hoursBack} hours for ${siteName} - ${parameter}`);

        // Find the most recent available "anchor" hour by searching back up to 6 hours
        let anchorDate = new Date();
        let foundAnchor = false;
        
        for (let offset = 0; offset <= 6; offset++) {
            const testUrl = this.getHourlyDataUrl(undefined, offset);
            try {
                const res = await fetch(testUrl);
                if (res.ok) {
                    const text = await res.text();
                    const parsed = this.parseDatFile(text);
                    if (parsed.allData.length > 0) {
                        anchorDate.setUTCHours(anchorDate.getUTCHours() - offset);
                        foundAnchor = true;
                        break;
                    }
                }
            } catch (e) { }
        }

        if (!foundAnchor) return [];

        // Generate URLs for the trailing X hours
        const urlsToFetch = [];
        for (let i = 0; i < hoursBack; i++) {
            const targetDate = new Date(anchorDate.getTime() - (i * 60 * 60 * 1000));
            const year = targetDate.getUTCFullYear();
            const month = String(targetDate.getUTCMonth() + 1).padStart(2, '0');
            const day = String(targetDate.getUTCDate()).padStart(2, '0');
            const hour = String(targetDate.getUTCHours()).padStart(2, '0');
            const s3Url = `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/today/HourlyData_${year}${month}${day}${hour}.dat`;
            // If the date crossed into yesterday, construct the historical layout
            const url = isNaN(targetDate.getTime()) ? '' : (targetDate.getUTCDate() !== new Date().getUTCDate() ?
                `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/${year}/${year}${month}${day}/HourlyData_${year}${month}${day}${hour}.dat`
                : s3Url);

            urlsToFetch.push(`/api/proxy?url=${encodeURIComponent(url)}`);
        }

        // Fetch all concurrently
        const responses = await Promise.allSettled(urlsToFetch.map(url => fetch(url).then(res => {
            if (!res.ok) throw new Error('Not found');
            return res.text();
        })));

        const trendData: { time: string, value: number, rawDate: Date }[] = [];

        responses.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
                const parsed = this.parseDatFile(result.value);
                const matchedPoint = parsed.allData.find(p => p.siteName.toLowerCase() === siteName.toLowerCase() && p.parameter === parameter);
                if (matchedPoint && matchedPoint.time) {
                    // Reconstruct a sortable Date to ensure Chronological order
                    let rawDate = new Date();
                    const [timeStr, ampm, tz] = matchedPoint.time.split(' ');
                    const [h, m] = timeStr.split(':');
                    if (h && m) {
                        let hours = parseInt(h);
                        if (ampm === 'PM' && hours < 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;
                        rawDate.setHours(hours, parseInt(m), 0, 0);
                        trendData.push({ time: matchedPoint.time, value: matchedPoint.value, rawDate });
                    }
                }
            }
        });

        // Sort chronologically (oldest to newest)
        return trendData.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime()).map(d => ({ time: d.time.replace(' CST', '').replace(' CDT', ''), value: d.value }));
    }

    static async fetchHistoricalDailyNAAQS(dateStr: string): Promise<any> {
        console.log(`Fetching official pre-calculated Individual Site NAAQS data for: ${dateStr}`);
        const [y, m, d] = dateStr.split('-');

        const s3Url = `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/${y}/${y}${m}${d}/daily_data.dat`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(s3Url)}`;

        try {
            const response = await fetch(proxyUrl);
            if (!response.ok) {
                throw new Error(`Failed to fetch daily_data.dat: ${response.status}`);
            }

            const text = await response.text();
            const lines = text.split('\n');
            const mssites: AQIDataPoint[] = [];
            const parameters = new Set<string>();
            const parameterData: Record<string, AQIDataPoint[]> = {};

            lines.forEach(line => {
                if (!line.trim()) return;
                const parts = line.split('|');

                // Format: Date | AQSID | Site Name | Parameter | Units | Value | Averaging Period | Agency
                // Ex: 03/03/26|280110002|CLEVELAND|OZONE-8HR|PPB|39|8|Mississippi DEQ
                if (parts.length >= 8 && parts[7].includes('Mississippi')) {
                    const siteName = parts[2];
                    const parameter = parts[3];
                    const units = parts[4];
                    const value = parseFloat(parts[5]);

                    // Exclude OZONE-1HR since OZONE-8HR is typically the requested parameter for historical NAAQS compliance
                    if (parameter === 'OZONE-1HR') return;

                    const mappedSiteName = Object.keys(CONFIG.sites).find(
                        k => k.toLowerCase() === siteName.toLowerCase()
                    ) || siteName;

                    const location = CONFIG.sites[mappedSiteName as keyof typeof CONFIG.sites] || null;

                    // Specifically suppress windspeed readings if present
                    if (mappedSiteName === 'Jackson NCORE' && parameter === 'RWD') return;

                    const aqiEstimate = this.getAQIInfo(parameter, value);

                    const dataPoint: AQIDataPoint = {
                        siteName: mappedSiteName,
                        parameter,
                        units,
                        value,
                        aqi: '',
                        aqiCategory: aqiEstimate?.category || '',
                        location,
                        date: parts[0],
                        time: `NAAQS Daily Average`
                    };

                    mssites.push(dataPoint);
                    parameters.add(parameter);
                    if (!parameterData[parameter]) {
                        parameterData[parameter] = [];
                    }
                    parameterData[parameter].push(dataPoint);
                }
            });

            return {
                allData: mssites,
                parameters: Array.from(parameters).sort(),
                parameterData
            };

        } catch (error) {
            console.error("NAAQS Fetch Error:", error);
            throw error;
        }
    }

    static async fetchTrendData(): Promise<any[]> {
        const dates = [];
        for (let i = 0; i < 10; i++) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            dates.push(d.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }));
        }

        const promises = dates.map(async (dateStr) => {
            try {
                // Fetch the official Daily NAAQS aggregations for the day
                const data = await this.fetchHistoricalDailyNAAQS(dateStr);

                // Map the parsed daily allData points to the format the TrendsChart expects
                return data.allData.map((point: any) => ({
                    date: dateStr,
                    area: point.siteName,
                    parameter: point.parameter,
                    units: point.units,
                    value: point.value,
                    aqi: point.aqi ? parseInt(point.aqi) : -1
                }));
            } catch (err) {
                console.warn(`Failed to fetch trend data for ${dateStr}`);
                return []; // Skip if day completely missing
            }
        });

        const results = await Promise.all(promises);

        // Flatten array
        const msTrendData = results.flat();
        return msTrendData;
    }

    static async fetchForecastData(zipCode: string): Promise<any> {
        const currentDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD

        // We proxy this through our Next.js API route to avoid CORS.
        // The API Key is now injected server-side by the proxy for security.
        const apiUrl = `https://www.airnowapi.org/aq/forecast/zipCode/?format=application/json&zipCode=${zipCode}&date=${currentDate}&distance=25`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}`;

        try {
            console.log(`Fetching forecast proxy (Secure): ${proxyUrl}`);
            const response = await fetch(proxyUrl);

            if (response.ok) {
                return await response.json();
            }

            throw new Error(`Failed to fetch forecast: ${response.status}`);
        } catch (error) {
            console.error("Forecast Fetch Error:", error);
            throw error;
        }
    }
}
