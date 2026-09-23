import type { NextConfig } from "next";
import path from "path";

const isDev = process.env.NODE_ENV === "development";

// Everything the pages load is same-origin (Next's scripts and styles, next/font files,
// /api/proxy, Vercel Analytics at /_vercel/insights), except the CARTO map tiles.
// 'unsafe-inline' is needed for Next's inline bootstrap scripts and the theme script in
// layout.tsx, and for React/Leaflet inline styles. `next dev` also needs 'unsafe-eval',
// and loads Vercel Analytics' debug script from va.vercel-scripts.com.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.basemaps.cartocdn.com",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {
    root: path.resolve(process.cwd()),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
