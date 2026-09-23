// The only upstream requests /api/proxy will make: the ones this dashboard itself sends.
// Anything else is refused, so the proxy can't be used as an open relay for AirNow
// (with our API key), for other S3 buckets, or for other ArcGIS tenants.

const S3_PREFIX = 'https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/';
// today/HourlyData_YYYYMMDDHH.dat, YYYY/YYYYMMDD/HourlyData_YYYYMMDDHH.dat,
// YYYY/YYYYMMDD/HourlyAQObs_YYYYMMDDHH.dat and YYYY/YYYYMMDD/daily_data.dat
const S3_FILE = /^(today\/HourlyData_\d{10}|\d{4}\/\d{8}\/(HourlyData_\d{10}|HourlyAQObs_\d{10}|daily_data))\.dat$/;

const MFC_QUERY = 'https://services5.arcgis.com/hE6urTTXj32LRUqx/arcgis/rest/services/MFC_Burn_Permit_Application_View_2/FeatureServer/0/query';
const MFC_WHERE = /^permit_date='\d{2}\/\d{2}\/\d{4}'$/;

const FORECAST = 'https://www.airnowapi.org/aq/forecast/current/';
const FORECAST_ZIPS = new Set(['38632', '39201', '39501']); // ForecastView's three locations

export interface ProxyTarget {
    url: URL;           // rebuilt from known parts, never the caller's string
    addApiKey: boolean; // only the AirNow forecast gets the key
}

// True when params holds exactly these names, each once, with these values.
function hasExactly(params: URLSearchParams, expected: Record<string, string>): boolean {
    const names = Array.from(params.keys());
    return names.length === Object.keys(expected).length &&
        Object.entries(expected).every(([name, value]) => params.getAll(name).length === 1 && params.get(name) === value);
}

function withQuery(base: string, query: Record<string, string>): URL {
    const url = new URL(base);
    url.search = new URLSearchParams(query).toString();
    return url;
}

export function resolveProxyTarget(raw: string): ProxyTarget | null {
    let u: URL;
    try {
        u = new URL(raw);
    } catch {
        return null;
    }
    if (u.protocol !== 'https:' || u.username || u.password || u.port || u.hash) return null;
    const base = u.origin + u.pathname;

    if (base.startsWith(S3_PREFIX)) {
        if (u.search || !S3_FILE.test(base.slice(S3_PREFIX.length))) return null;
        return { url: new URL(base), addApiKey: false };
    }

    if (base === MFC_QUERY) {
        const query = { where: u.searchParams.get('where') ?? '', outFields: '*', f: 'geojson', outSR: '4326' };
        if (!MFC_WHERE.test(query.where) || !hasExactly(u.searchParams, query)) return null;
        return { url: withQuery(MFC_QUERY, query), addApiKey: false };
    }

    if (base === FORECAST) {
        const query = { format: 'application/json', zipCode: u.searchParams.get('zipCode') ?? '', distance: '25' };
        if (!FORECAST_ZIPS.has(query.zipCode) || !hasExactly(u.searchParams, query)) return null;
        return { url: withQuery(FORECAST, query), addApiKey: true };
    }

    return null;
}
