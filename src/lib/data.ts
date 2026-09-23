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
    },
    // Category by AQI number (TAD Table 6), for any pollutant once its AQI is known
    aqiIndexScale: [
        { max: 50, category: 'Good', color: '#00e400', class: 'good' },
        { max: 100, category: 'Moderate', color: '#ffff00', class: 'moderate' },
        { max: 150, category: 'Unhealthy for Sensitive Groups', color: '#ff7e00', class: 'usg' },
        { max: 200, category: 'Unhealthy', color: '#ff0000', class: 'unhealthy' },
        { max: 300, category: 'Very Unhealthy', color: '#99004c', class: 'very-unhealthy' },
        { max: Infinity, category: 'Hazardous', color: '#7e0023', class: 'hazardous' }
    ] as Threshold[]
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
    aqsId?: string;
    observedAt?: string;     // ISO UTC start of the observation hour
    aqiEstimated?: boolean;  // true while AirNow's own AQI for this hour isn't published yet
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
        
        // EPA AQI Technical Assistance Document (EPA-403/B-26-003), step 1: truncate first
        // (O3 ppm to 3 decimals = whole ppb, PM2.5 to 0.1 ug/m3, PM10 to a whole ug/m3),
        // so a value such as 35.45 can't fall in the gap between two breakpoints.
        const scale = (cleanParam === 'PM2.5' || cleanParam === 'PM25') ? 10 : 1;
        const conc = Math.floor(value * scale + 1e-6) / scale;

        const range = breakpoints.find(b => conc >= b.cLow && conc <= b.cHigh);
        if (!range) {
            if (conc < 0) return 0;
            const maxRange = breakpoints[breakpoints.length - 1];
            if (conc > maxRange.cHigh) {
                return maxRange.iHigh;
            }
            return -1; // not a number we can score; never return the concentration as an AQI
        }

        const aqi = ((range.iHigh - range.iLow) / (range.cHigh - range.cLow)) * (conc - range.cLow) + range.iLow;
        return Math.round(aqi);
    }

    static getAQIInfo(parameter: string, value: number) {
        // Strip out the custom aggregation suffixes to map to the core configuration metric (e.g. OZONE-8HR MAX -> OZONE)
        const cleanParam = parameter.split('-')[0];

        // Parameters without a table (TEMP, RWS, SO2, CO, NO2 concentrations) get no category:
        // the AQI-number scale applied to ppb, ppm, degrees C or knots isn't an AQI.
        const thresholds: Threshold[] | undefined = CONFIG.aqiThresholds[cleanParam as keyof typeof CONFIG.aqiThresholds];
        return thresholds?.find(t => value <= t.max);
    }

    static getAQIInfoForIndex(aqi: number) {
        return Number.isFinite(aqi) && aqi >= 0 ? CONFIG.aqiIndexScale.find(t => aqi <= t.max) : undefined;
    }

    // Category and color of a table/map row, from its AQI number (undefined when it has none)
    static rowInfo(row: AQIDataPoint) {
        return DataService.getAQIInfoForIndex(parseInt(row.aqi));
    }

    static normalizeAqsId(id: string) {
        const t = id.trim();
        return t.length === 12 && t.startsWith('840') ? t.slice(3) : t;
    }

    // Split one line of a quoted, comma-delimited file (HourlyAQObs)
    static splitCsvLine(line: string): string[] {
        const out: string[] = [];
        let cur = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (quoted) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') quoted = false;
                else cur += ch;
            } else if (ch === '"') quoted = true;
            else if (ch === ',') { out.push(cur); cur = ''; }
            else cur += ch;
        }
        out.push(cur);
        return out;
    }

    // AirNow's HourlyAQObs_YYYYMMDDHH.dat carries, per site, the NowCast AQI for ozone, PM2.5
    // and PM10 and the 1-hour AQI for NO2 (AirNow "Hourly AQ Obs File" fact sheet). Returns
    // AQS ID -> { parameter name as in HourlyData: AQI } for Mississippi sites.
    static parseNowCastFile(content: string): Map<string, Record<string, number>> {
        const byId = new Map<string, Record<string, number>>();
        const lines = content.split('\n');
        const header = DataService.splitCsvLine((lines[0] || '').trim());
        const idCol = header.indexOf('AQSID');
        const cols: Record<string, number> = {
            'OZONE': header.indexOf('OZONE_AQI'),
            'PM2.5': header.indexOf('PM25_AQI'),
            'PM10': header.indexOf('PM10_AQI'),
            'NO2': header.indexOf('NO2_AQI'),
        };
        if (idCol < 0) return byId;
        for (const line of lines.slice(1)) {
            if (!/^"?(840)?28/.test(line)) continue; // Mississippi sites only
            const fields = DataService.splitCsvLine(line.trim());
            const aqis: Record<string, number> = {};
            for (const [param, col] of Object.entries(cols)) {
                const v = col >= 0 ? (fields[col] || '').trim() : '';
                if (v !== '' && Number.isFinite(Number(v))) aqis[param] = Math.round(Number(v));
            }
            byId.set(DataService.normalizeAqsId(fields[idCol] || ''), aqis);
        }
        return byId;
    }

    static async fetchNowCast(hourlyProxyUrl: string): Promise<Map<string, Record<string, number>> | null> {
        // Same hour as the hourly file, but it is only published in the dated folder
        const m = decodeURIComponent(hourlyProxyUrl).match(/HourlyData_((\d{4})(\d{4})\d{2})\.dat$/);
        if (!m) return null;
        const [, stamp, y, md] = m;
        const s3Url = `https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/${y}/${y}${md}/HourlyAQObs_${stamp}.dat`;
        try {
            const response = await fetch(`/api/proxy?url=${encodeURIComponent(s3Url)}`);
            return response.ok ? DataService.parseNowCastFile(await response.text()) : null;
        } catch {
            return null;
        }
    }

    // The "current" AQI must be AirNow's: for ozone and PM that is the NowCast, not one hour's
    // concentration scored against 8-hour/24-hour breakpoints (TAD EPA-403/B-26-003, "Real-time
    // AQI reporting: the NowCast"). Rows keep the one-hour estimate, flagged, until AirNow
    // publishes that hour's AQI file.
    static applyNowCast(data: ParsedAirQualityData, nowcast: Map<string, Record<string, number>> | null) {
        data.allData.forEach(row => {
            const official = nowcast?.get(row.aqsId || '')?.[row.parameter];
            if (official !== undefined && official >= 0) {
                row.aqi = String(official);
                row.aqiEstimated = false;
            } else {
                row.aqiEstimated = row.aqi !== '--';
            }
            row.aqiCategory = DataService.rowInfo(row)?.category || '';
        });
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
                let observedAt: string | undefined;

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
                        observedAt = dateObj.toISOString();
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
 
                // One-hour estimate; fetchAirQualityData replaces it with AirNow's NowCast AQI
                const aqiVal = DataService.calculateAQI(parameter, value);
                const aqiValue = aqiVal >= 0 ? String(aqiVal) : '--';
                const category = DataService.getAQIInfoForIndex(aqiVal)?.category || '';

                const mappedSiteName = Object.keys(CONFIG.sites).find(
                    k => k.toLowerCase() === siteName.toLowerCase()
                ) || siteName;

                const location = CONFIG.sites[mappedSiteName as keyof typeof CONFIG.sites];
                // Site names aren't unique nationwide (Idaho DEQ also has a "Meridian"), so the
                // AQS ID must be in Mississippi: state code 28, optionally after the 840 country code.
                const inMississippi = /^(840)?28\d{7}$/.test((parts[2] || '').trim());
                const isMississippi = inMississippi && (location || (parts.length > 8 && parts[8].includes('Mississippi')));

                if (isMississippi && siteName && parameter && !isNaN(value)) {
                    if (mappedSiteName === 'Jackson NCORE' && parameter === 'RWD') return;

                    const dataPoint: AQIDataPoint = { siteName: mappedSiteName, parameter, units, value, aqi: aqiValue, aqiCategory: category, location: location || null, date: obsDate, time: obsTime, aqsId: DataService.normalizeAqsId(parts[2] || ''), observedAt };

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
            const info = this.rowInfo(p);
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

        const finalInfo = this.rowInfo(maxAQIPoint);
        
        // Collect all sites that hit both the max rank AND the max AQI value
        const tiedSites = allData.filter(p => {
            const info = this.rowInfo(p);
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
            parameter: maxAQIPoint.parameter,
            estimated: !!maxAQIPoint.aqiEstimated
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

                DataService.applyNowCast(parsed, await DataService.fetchNowCast(url));
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

    static async fetchHistoricalDailyNAAQS(dateStr: string): Promise<ParsedAirQualityData> {
        console.log(`Fetching AirNow daily summary (preliminary data) for: ${dateStr}`);
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

                    // Exclude OZONE-1HR: the daily ozone AQI is based on the daily max 8-hour average (OZONE-8HR)
                    if (parameter === 'OZONE-1HR') return;

                    const mappedSiteName = Object.keys(CONFIG.sites).find(
                        k => k.toLowerCase() === siteName.toLowerCase()
                    ) || siteName;

                    const location = CONFIG.sites[mappedSiteName as keyof typeof CONFIG.sites] || null;

                    // Specifically suppress windspeed readings if present
                    if (mappedSiteName === 'Jackson NCORE' && parameter === 'RWD') return;

                    const aqiVal = DataService.calculateAQI(parameter, value);

                    const dataPoint: AQIDataPoint = {
                        siteName: mappedSiteName,
                        parameter,
                        units,
                        value,
                        aqi: aqiVal >= 0 ? String(aqiVal) : '--',
                        aqiCategory: DataService.getAQIInfoForIndex(aqiVal)?.category || '',
                        location,
                        date: parts[0],
                        time: `Daily summary`
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
            console.error("Daily data fetch error:", error);
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
                // Fetch AirNow's daily summaries for the day (preliminary data)
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
