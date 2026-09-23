# Mississippi Ambient Air Quality Dashboard

A premium, high-performance, interactive dashboard built for the Mississippi Department of Environmental Quality (MDEQ) to visualize real-time and historical air quality data across the state.

**Live Deployment:** [https://mdeq-air-quality-dashboard.vercel.app/](https://mdeq-air-quality-dashboard.vercel.app/)

## 🌟 Key Features

- **Premium Glassmorphism UI**: A modern, translucent design system with a high-end dark mode, vibrant HSL-based colors, and smooth micro-animations.
- **Real-Time Statewide Overview**: Instantly view the current overall air quality status (AirNow's official NowCast AQI for each monitor), identify regional hotspots (with smart tie-breaking logic), and receive actionable health recommendations.
- **Interactive Legend Filtering**: Dynamically filter the entire dashboard by clicking AQI categories (e.g., "Good", "Moderate") to focus on specific air quality levels across the map and data tables.
- **Dynamic Mapping**: Leaflet integration showing color-coded monitoring stations with "Live" pulse indicators for data freshness.
- **Historical Analysis & Trends**: 
    - **Daily Lookback**: Select any past date to review AirNow's daily summaries (preliminary data, not for NAAQS compliance).
    - **10-Day Trends**: Interactive Chart.js visualizations for individual pollutants (Ozone, PM2.5, NOy, CO, SO2).
- **Air Quality Forecasts**: Multi-day forecasts for Hernando, Jackson and the Gulf Coast from AirNow's current-forecast service.
- **MFC Burn Permits**: Real-time spatial distribution of active prescribed burn permits issued by the Mississippi Forestry Commission.

## 🚀 Performance & Reliability

This dashboard is engineered for high availability and low latency:
- **Smart Hour Persistence**: Automatically handles the AirNow top-of-hour polling gap. If the latest data file isn't populated yet, the system performs a recursive search back through previous hours to ensure the dashboard always shows valid data.
- **Secure Server-Side Proxy**:
    - **Credential Injection**: Protects sensitive AirNow API keys by injecting them server-side, ensuring they are never exposed to the client.
    - **Strict Allowlist**: The proxy route (`/api/proxy`) only makes the exact requests the dashboard needs: AirNow's hourly and daily S3 files, the MFC burn-permit query, and the forecast for the three forecast zip codes. Anything else gets a 400/403, redirects are refused, and replies carry no CORS header (the app calls it from its own origin). `node scripts/proxy-check.mjs [baseUrl]` checks a running server.
    - **Advanced Caching**: Implements SWR (stale-while-revalidate) pattern to provide near-instant load times while keeping data fresh.
- **Lazy Loading**: Heavy map and chart components are dynamically imported to minimize initial page load.

## 🛠️ Technology Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/) with custom HSL design tokens
- **Icons**: [Lucide React](https://lucide.dev/)
- **Mapping**: [React-Leaflet](https://react-leaflet.js.org/)
- **Charting**: [Chart.js](https://www.chartjs.org/)
- **Data Source**: Official AirNow S3 Data, AirNow API, and MFC ArcGIS FeatureServer.

## 📂 Project Structure

- `src/app/page.tsx`: Main dashboard entry point with layout and state management.
- `src/components/`: Modular UI components (AQIMap, SummaryCards, TrendsChart, ForecastView, BurnPermitsView).
- `src/lib/data.ts`: Central `DataService` for parsing `.dat` files, AQI mapping, and Smart Hour logic.
- `src/app/api/proxy/route.ts` and `src/lib/proxyTargets.ts`: Server-side proxy for AirNow/MFC data and its allowlist; the AirNow key is added server-side and never reaches the browser.

## ✉️ Contact & Support

For questions, bug reports, or feedback regarding this dashboard, please contact:
**Rodney Cuevas** - [RCuevas@mdeq.ms.gov](mailto:RCuevas@mdeq.ms.gov)
