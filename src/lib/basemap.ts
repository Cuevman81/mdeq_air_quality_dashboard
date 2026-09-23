// Basemap tiles for the Leaflet maps. CARTO's basemaps now need an API key (unkeyed tiles
// carry an "API KEY REQUIRED" watermark), so these are Esri's keyless gray canvas tiles.
// Each theme has a base layer and a label overlay; render both, in the same group.
const ESRI_CANVAS = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas';

export const BASEMAP_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ';
export const BASEMAP_MAX_ZOOM = 16; // the gray canvas has no tiles past 16

export function basemapTiles(isDark: boolean) {
    const style = isDark ? 'World_Dark_Gray' : 'World_Light_Gray';
    return {
        base: `${ESRI_CANVAS}/${style}_Base/MapServer/tile/{z}/{y}/{x}`,
        labels: `${ESRI_CANVAS}/${style}_Reference/MapServer/tile/{z}/{y}/{x}`,
    };
}
