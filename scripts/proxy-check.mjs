#!/usr/bin/env node
// Checks /api/proxy on a running server (local `next start` or the live site):
//   - the requests the dashboard itself makes still work;
//   - anything else is refused by the proxy (400/403) before it contacts an upstream;
//   - no reply carries Access-Control-Allow-Origin.
//
// Usage: node scripts/proxy-check.mjs [baseUrl]      (default http://localhost:3000)
// The forecast checks need AIRNOW_API_KEY set on that server.

const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const S3 = 'https://s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow';
const MFC = 'https://services5.arcgis.com/hE6urTTXj32LRUqx/arcgis/rest/services/MFC_Burn_Permit_Application_View_2/FeatureServer/0/query';
const FORECAST = 'https://www.airnowapi.org/aq/forecast/current/';

const pad = (n) => String(n).padStart(2, '0');
const utcHour = (hoursAgo) => {
    const d = new Date(Date.now() - hoursAgo * 3600e3);
    const ymd = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
    return { y: ymd.slice(0, 4), ymd, stamp: `${ymd}${pad(d.getUTCHours())}` };
};
const chicagoDate = (daysAgo) => new Date(Date.now() - daysAgo * 86400e3).toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

const h = utcHour(2);                       // two hours back is always published
const yesterday = chicagoDate(1).split('-'); // [y, m, d]
const today = chicagoDate(0).split('-');
const mfcWhere = `permit_date='${today[1]}/${today[2]}/${today[0]}'`;
const forecastUrl = (zip, extra = '') => `${FORECAST}?format=application/json&zipCode=${zip}&distance=25${extra}`;

// [label, target url, expected status, check on the body]
const allowed = [
    ['current hourly file (today/)', `${S3}/today/HourlyData_${h.stamp}.dat`, 200, (t) => t.includes('|')],
    ['dated hourly file', `${S3}/${h.y}/${h.ymd}/HourlyData_${h.stamp}.dat`, 200, (t) => t.includes('|')],
    ['hourly NowCast AQI file', `${S3}/${h.y}/${h.ymd}/HourlyAQObs_${h.stamp}.dat`, 200, (t) => t.startsWith('"AQSID"')],
    ['daily file', `${S3}/${yesterday[0]}/${yesterday.join('')}/daily_data.dat`, 200, (t) => t.includes('|')],
    ['not-yet-published hour passes the 404 through', `${S3}/today/HourlyData_${utcHour(-48).stamp}.dat`, 404, null],
    ['MFC burn permits', `${MFC}?where=${encodeURIComponent(mfcWhere)}&outFields=*&f=geojson&outSR=4326`, 200, (t) => Array.isArray(JSON.parse(t).features)],
    ...['38632', '39201', '39501'].map((zip) => [`forecast ${zip}`, forecastUrl(zip), 200, (t) => Array.isArray(JSON.parse(t)) && JSON.parse(t).length > 0]),
];

const refused = [
    ['other AirNow service', `https://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&zipCode=39201&distance=25`],
    ['retired zipCode forecast', `https://www.airnowapi.org/aq/forecast/zipCode/?format=application/json&zipCode=39201&date=2026-09-22&distance=25`],
    ['AirNow bulk data', `https://www.airnowapi.org/aq/data/?startDate=2026-09-01T00&endDate=2026-09-22T00&parameters=OZONE,PM25&BBOX=-125,24,-66,50&dataType=B&format=application/json&verbose=1`],
    ['forecast, other zip', forecastUrl('90210')],
    ['forecast, other distance', `${FORECAST}?format=application/json&zipCode=39201&distance=500`],
    ['forecast, extra parameter', forecastUrl('39201', '&date=2026-09-22')],
    ['forecast, caller-supplied API_KEY', forecastUrl('39201', '&API_KEY=FAKEkey9x2')],
    ['forecast, duplicated zipCode', forecastUrl('39201', '&zipCode=90210')],
    ['forecast over http', forecastUrl('39201').replace('https:', 'http:')],
    ['airnowapi.org without www', forecastUrl('39201').replace('www.', '')],
    ['S3, other bucket', `https://s3-us-west-1.amazonaws.com/some-other-bucket/HourlyData_${h.stamp}.dat`],
    ['S3, bucket listing', `${S3}/today/HourlyData_${h.stamp}.dat?list-type=2`],
    ['S3, other file in the bucket', `${S3}/${h.y}/${h.ymd}/reportingarea.dat`],
    ['S3, ../ traversal', `${S3}/today/../../other-bucket/HourlyData_${h.stamp}.dat`],
    ['S3, %2e%2e traversal', `${S3}/today/%2e%2e/%2e%2e/other-bucket/HourlyData_${h.stamp}.dat`],
    ['S3, virtual-host bucket', `https://files.airnowtech.org.s3-us-west-1.amazonaws.com/airnow/today/HourlyData_${h.stamp}.dat`],
    ['S3, user@host', `https://files.airnowtech.org@s3-us-west-1.amazonaws.com/files.airnowtech.org/airnow/today/HourlyData_${h.stamp}.dat`],
    ['S3, explicit port', `https://s3-us-west-1.amazonaws.com:8443/files.airnowtech.org/airnow/today/HourlyData_${h.stamp}.dat`],
    ['ArcGIS, other tenant', `https://services.arcgis.com/abcdefgh12345678/arcgis/rest/services/x/FeatureServer/0/query?where=1%3D1&outFields=*&f=geojson`],
    ['MFC, other where clause', `${MFC}?where=${encodeURIComponent('1=1')}&outFields=*&f=geojson&outSR=4326`],
    ['MFC, extra parameter', `${MFC}?where=${encodeURIComponent(mfcWhere)}&outFields=*&f=geojson&outSR=4326&resultRecordCount=100000`],
    ['lookalike host', `https://s3-us-west-1.amazonaws.com.evil.example/files.airnowtech.org/airnow/today/HourlyData_${h.stamp}.dat`],
];

let failures = 0;
const report = (ok, label, detail) => {
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(48)} ${detail}`);
};
const call = (query) => fetch(`${base}/api/proxy${query}`, { redirect: 'manual' });

console.log(`/api/proxy checks against ${base}\n-- the app's own requests`);
for (const [label, target, expect, check] of allowed) {
    const res = await call(`?url=${encodeURIComponent(target)}`);
    const body = await res.text();
    let bodyOk = true;
    try { bodyOk = !check || check(body); } catch { bodyOk = false; }
    const acao = res.headers.get('access-control-allow-origin');
    const nosniff = res.headers.get('x-content-type-options') === 'nosniff';
    report(res.status === expect && bodyOk && !acao && nosniff, label,
        `HTTP ${res.status} (want ${expect}), ${body.length} bytes${bodyOk ? '' : ', unexpected body'}${acao ? ', ACAO ' + acao : ''}${nosniff ? '' : ', no nosniff'}`);
}

console.log('-- refused (never fetched)');
const isRefusal = async (res, status) => res.status === status && (await res.json().catch(() => ({}))).error === (status === 403 ? 'Target not allowed' : 'Bad request');
for (const [label, target] of refused) {
    const res = await call(`?url=${encodeURIComponent(target)}`);
    const acao = res.headers.get('access-control-allow-origin');
    report(await isRefusal(res, 403) && !acao, label, `HTTP ${res.status}${acao ? ', ACAO ' + acao : ''}`);
}
for (const [label, query] of [
    ['no url parameter', ''],
    ['extra proxy parameter (cache-buster)', `?url=${encodeURIComponent(forecastUrl('39201'))}&cb=123`],
    ['two url parameters', `?url=${encodeURIComponent(forecastUrl('39201'))}&url=${encodeURIComponent(forecastUrl('90210'))}`],
    ['url that does not parse', '?url=not%20a%20url'],
]) {
    const res = await call(query);
    const want = label === 'url that does not parse' ? 403 : 400;
    report(await isRefusal(res, want), label, `HTTP ${res.status} (want ${want})`);
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall checks passed');
process.exit(failures ? 1 : 0);
