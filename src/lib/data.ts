export interface ParsedAirQualityData {
    allData: AQIDataPoint[];
    parameters: string[];
    parameterData: Record<string, AQIDataPoint[]>;
}

export interface TrendDataPoint {
    date: string;
    area: string;
    parameter: string;
    units: string;
    value: number;
    aqi: number;
}

export interface ForecastItem {
    DateForecast: string;
    ParameterName: string;
    AQI: number;
    Category: {
        Number: number;
        Name: string;
    };
    Discussion?: string;
}

export interface Threshold {
    max: number;
    category: string;
    color: string;
    class: string;
}

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
            { max: 125.4, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
            { max: 225.4, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
            { max: Infinity, category: 'Hazardous', color: '#7e0023', class: 'hazardous' }
        ],
        'PM10': [
            { max: 54, category: 'Good', color: '#00e400', class: 'good' },
            { max: 154, category: 'Moderate', color: '#ffff00', class: 'moderate' },
            { max: 254, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'usg' },
            { max: 354, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
            { max: 424, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
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

    static calculateAQI(parameter: string, value: number): number {
        const cleanParam = parameter.split('-')[0].toUpperCase();
        
        let breakpoints: { cLow: number, cHigh: number, iLow: number, iHigh: number }[] = [];
        
        if (cleanParam === 'PM2.5' || cleanParam === 'PM25') {
            breakpoints = [
                { cLow: 0.0, cHigh: 9.0, iLow: 0, iHigh: 50 },
                { cLow: 9.1, cHigh: 35.4, iLow: 51, iHigh: 100 },
                { cLow: 35.5, cHigh: 55.4, iLow: 101, iHigh: 150 },
                { cLow: 55.5, cHigh: 125.4, iLow: 151, iHigh: 200 },
                { cLow: 125.5, cHigh: 225.4, iLow: 201, iHigh: 300 },
                { cLow: 225.5, cHigh: 325.4, iLow: 301, iHigh: 500 }
            ];
        } else if (cleanParam === 'OZONE' || cleanParam === 'O3') {
            breakpoints = [
                { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
                { cLow: 55, cHigh: 70, iLow: 51, iHigh: 100 },
                { cLow: 71, cHigh: 85, iLow: 101, iHigh: 150 },
                { cLow: 86, cHigh: 105, iLow: 151, iHigh: 200 },
                { cLow: 106, cHigh: 200, iLow: 201, iHigh: 300 },
                { cLow: 201, cHigh: 600, iLow: 301, iHigh: 500 }
            ];
        } else if (cleanParam === 'PM10') {
            breakpoints = [
                { cLow: 0, cHigh: 54, iLow: 0, iHigh: 50 },
                { cLow: 55, cHigh: 154, iLow: 51, iHigh: 100 },
                { cLow: 155, cHigh: 254, iLow: 101, iHigh: 150 },
                { cLow: 255, cHigh: 354, iLow: 151, iHigh: 200 },
                { cLow: 355, cHigh: 424, iLow: 201, iHigh: 300 },
                { cLow: 425, cHigh: 504, iLow: 301, iHigh: 400 },
                { cLow: 505, cHigh: 604, iLow: 401, iHigh: 500 }
            ];
        } else {
            return -1;
        }
        
        const range = breakpoints.find(b => value >= b.cLow && value <= b.cHigh);
        if (!range) {
            if (value < 0) return 0;
            const maxRange = breakpoints[breakpoints.length - 1];
            if (value > maxRange.cHigh) {
                return maxRange.iHigh;
            }
            return Math.round(value);
        }
        
        const aqi = ((range.iHigh - range.iLow) / (range.cHigh - range.cLow)) * (value - range.cLow) + range.iLow;
        return Math.round(aqi);
    }

    static getAQIInfo(parameter: string, value: number) {
        // Strip out the custom aggregation suffixes to map to the core configuration metric (e.g. OZONE-8HR MAX -> OZONE)
        const cleanParam = parameter.split('-')[0];

        const thresholds: Threshold[] = CONFIG.aqiThresholds[cleanParam as keyof typeof CONFIG.aqiThresholds] || [
            { max: 50, category: 'Good', color: '#00e400', class: 'good' },
            { max: 100, category: 'Moderate', color: '#ffff00', class: 'moderate' },
            { max: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'usg' },
            { max: 200, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
            { max: 300, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
            { max: Infinity, category: 'Hazardous', color: '#7e0023', class: 'hazardous' }
        ];
        return thresholds.find(t => value <= t.max);
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
            // Remove cache buster to enable 5-minute CDN proxy caching
            return `/api/proxy?url=${encodeURIComponent(s3Url)}`;
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

                // Calculate UTC to LST (America/Chicago)
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
                } catch {
                    // Fallback to raw if parsing fails
                }
 
                const siteName = parts[3];
                const parameter = parts[5];
                const units = parts[6];
                const value = parseFloat(parts[7]);
 
                // Calculate AQI category from thresholds since index 8 is usually Agency name
                const aqiInfo = this.getAQIInfo(parameter, value);
                const aqiVal = DataService.calculateAQI(parameter, value);
                const aqiValue = aqiVal >= 0 ? String(aqiVal) : '--';
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
          } catch { return 0; }
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
        let maxAQIValue = -1;
        let maxAQIPoint: AQIDataPoint | null = null;

        // First find the threshold for the "worst" current conditions
        allData.forEach(p => {
            const info = this.getAQIInfo(p.parameter, p.value);
            const category = info?.category || 'Unknown';
            const rank = severityRank[category] || 0;
            const aqiNum = parseInt(p.aqi) || 0;

            if (rank > maxRank) {
                maxRank = rank;
                maxAQIValue = aqiNum;
                maxAQIPoint = p;
            } else if (rank === maxRank && aqiNum > maxAQIValue) {
                maxAQIValue = aqiNum;
                maxAQIPoint = p;
            }
        });

        if (!maxAQIPoint) {
            maxAQIPoint = allData[0];
            maxAQIValue = parseInt(maxAQIPoint.aqi) || 0;
        }

        const finalInfo = this.getAQIInfo(maxAQIPoint.parameter, maxAQIPoint.value);
        
        // Collect all sites that hit both the max rank AND the max AQI value
        const tiedSites = allData.filter(p => {
            const info = this.getAQIInfo(p.parameter, p.value);
            const rank = severityRank[info?.category || 'Unknown'] || 0;
            const aqiNum = parseInt(p.aqi) || 0;
            return rank === maxRank && aqiNum === maxAQIValue;
        });

        // Distinct site names
        const hotspotNames = Array.from(new Set(tiedSites.map(s => s.siteName)));

        return {
            maxAQI: maxAQIValue,
            hotspotSite: hotspotNames[0], // Backward compatibility
            hotspotSites: hotspotNames,
            category: finalInfo?.category || 'Unknown',
            color: finalInfo?.color || '#cbd5e1',
            parameter: maxAQIPoint.parameter
        };
    }

    static async fetchAirQualityData(dateStr: string | null = null, absoluteOffset = 0): Promise<ParsedAirQualityData> {
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
        } catch (err) {
            const error = err as Error;
            if (error.message.includes('exhausted')) throw error;
            console.warn(`Network error at offset ${absoluteOffset}, searching back...`, error);
            return this.fetchAirQualityData(dateStr, absoluteOffset + 1);
        }
    }

    static async fetchTrailingHourlyData(siteName: string, parameter: string, hoursBack: number = 12): Promise<{ time: string, value: number }[]> {
        console.log(`Fetching trailing ${hoursBack} hours for ${siteName} - ${parameter}`);

        // Find the most recent available "anchor" hour by searching back up to 6 hours
        const anchorDate = new Date();
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
            } catch { }
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
                    const rawDate = new Date();
                    const [timeStr, ampm] = matchedPoint.time.split(' ');
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

    static async fetchHistoricalDailyNAAQS(dateStr: string): Promise<ParsedAirQualityData> {
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
                    const aqiVal = DataService.calculateAQI(parameter, value);

                    const dataPoint: AQIDataPoint = {
                        siteName: mappedSiteName,
                        parameter,
                        units,
                        value,
                        aqi: aqiVal >= 0 ? String(aqiVal) : '--',
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

    static async fetchTrendData(): Promise<TrendDataPoint[]> {
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
                return data.allData.map((point) => ({
                    date: dateStr,
                    area: point.siteName,
                    parameter: point.parameter,
                    units: point.units,
                    value: point.value,
                    aqi: point.aqi ? parseInt(point.aqi) : -1
                }));
            } catch {
                console.warn(`Failed to fetch trend data for ${dateStr}`);
                return []; // Skip if day completely missing
            }
        });

        const results = await Promise.all(promises);

        // Flatten array
        const msTrendData = results.flat();
        return msTrendData;
    }

    // AirNow's "Current Forecasts" service (/aq/forecast/current/) replaces the
    // "Forecasts By Zip Code" service that retires on 2026-09-30. It renames the
    // fields (DateForecast -> dateValid, Category{Number,Name} -> categoryNumber/
    // categoryName, AQI -> aqi, ...) and calls ozone "OZONE" instead of "O3".
    // Map either shape back to ForecastItem so ForecastView needs no changes.
    static normalizeForecast(raw: Record<string, unknown>): ForecastItem {
        const pick = (...keys: string[]) => {
            for (const k of keys) if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k];
            return undefined;
        };
        const category = (raw.Category ?? {}) as { Number?: number; Name?: string };
        const parameter = String(pick('ParameterName', 'parameterName') ?? '').trim();
        const aqi = Number(pick('AQI', 'aqi'));
        const discussion = pick('Discussion', 'discussion');
        return {
            DateForecast: String(pick('DateForecast', 'dateValid') ?? '').trim().slice(0, 10),
            ParameterName: parameter.toUpperCase() === 'OZONE' ? 'O3' : parameter,
            AQI: Number.isFinite(aqi) ? aqi : -1,
            Category: {
                Number: Number(category.Number ?? pick('categoryNumber') ?? 0),
                Name: String(category.Name ?? pick('categoryName') ?? 'Unknown'),
            },
            Discussion: discussion === undefined ? undefined : String(discussion),
        };
    }

    static async fetchForecastData(zipCode: string): Promise<ForecastItem[]> {
        // We proxy this through our Next.js API route to avoid CORS.
        // The API Key is injected server-side by the proxy, which only accepts this exact URL shape.
        // The current-forecast service returns today and the following days, so no &date= is needed.
        const apiUrl = `https://www.airnowapi.org/aq/forecast/current/?format=application/json&zipCode=${zipCode}&distance=25`;
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(apiUrl)}`;

        try {
            console.log(`Fetching forecast proxy (Secure): ${proxyUrl}`);
            const response = await fetch(proxyUrl);

            if (response.ok) {
                const rows = await response.json();
                return Array.isArray(rows) ? rows.map((r: Record<string, unknown>) => DataService.normalizeForecast(r)) : [];
            }

            throw new Error(`Failed to fetch forecast: ${response.status}`);
        } catch (error) {
            console.error("Forecast Fetch Error:", error);
            throw error;
        }
    }
}
