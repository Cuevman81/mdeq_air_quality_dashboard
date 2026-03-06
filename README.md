# Mississippi Ambient Air Quality Dashboard

A high-performance, interactive dashboard built for the Mississippi Department of Environmental Quality (MDEQ) to visualize real-time and historical air quality data across the state.

**Live Deployment:** [https://mdeq-air-quality-dashboard.vercel.app/](https://mdeq-air-quality-dashboard.vercel.app/)

## 🌟 Key Features

- **Real-Time Statewide Overview**: Instantly view the current overall air quality status, the highest reported site (hotspot), and actionable health recommendations based on EPA AQI standards.
- **Interactive Map**: A dynamic Mapbox/Leaflet integration showing all active air monitoring stations with color-coded markers representing current AQI levels.
- **Historical Analysis**: Seamlessly select past dates to review historical daily averages with automatic data fetching.
- **Pollutant Trends**: View historical 10-day trends for individual sites and pollutants (Ozone, PM2.5, NOy, CO, SO2) with interactive charts.
- **Air Quality Forecasts**: Search by zip code to get multi-day air quality forecasts directly from AirNow.
- **MFC Burn Permits Integration**: Dedicated dashboard for viewing active prescribed burn permits issued by the Mississippi Forestry Commission.

## 🚀 Performance Optimizations

This dashboard is built with speed in mind to handle large datasets and frequent updates:
- **Server-Side Proxy Caching**: Implements a highly efficient proxy route (`/api/proxy`) with Next.js caching. This securely fetches external data from AirNow's S3 buckets while avoiding CORS issues and caching the payload for 5 minutes, resulting in near-instant load times for end-users.
- **Lazy Loading**: Map components and heavy charts are dynamically imported (`next/dynamic`) to reduce the initial JavaScript payload.
- **Smart Rollover Logic**: Robust data fetchers intelligently handle "top of the hour" data gaps when AirNow publishes empty placeholder files, automatically falling back to the last known good hour.

## 🛠️ Technology Stack

- **Framework**: [Next.js](https://nextjs.org/) (React)
- **Deployment**: [Vercel](https://vercel.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Mapping**: [React-Leaflet](https://react-leaflet.js.org/) (with OpenStreetMap tiles)
- **Charting**: [Chart.js](https://www.chartjs.org/) & [react-chartjs-2](https://react-chartjs-2.js.org/)
- **Data Source**: Official AirNow API and S3 data buckets

## 📂 Project Structure

- `src/app/page.tsx`: The main dashboard page and layout.
- `src/components/`: Reusable UI components including the `AQIMap`, `SummaryCards`, `TrendsChart`, and `ForecastView`.
- `src/lib/data.ts`: The central `DataService` logic responsible for parsing AirNow `.dat` files, calculating statewide summaries, and managing AQI thresholds.
- `src/app/api/proxy/route.ts`: The backend mechanism for bypassing CORS and implementing server-side short-term caching.
