import { NextRequest, NextResponse } from 'next/server';
import { resolveProxyTarget } from '@/lib/proxyTargets';

// Same-origin only: the dashboard calls this from its own pages, so there is no
// Access-Control-Allow-Origin header, and other sites' pages can't read the replies.
const refuse = (status: number, error: string) =>
    NextResponse.json({ error }, { status, headers: { 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store' } });

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const names = Array.from(searchParams.keys());

    // Exactly one parameter, `url`. Extra parameters would only serve to bypass the CDN cache.
    if (names.length !== 1 || names[0] !== 'url') {
        return refuse(400, 'Bad request');
    }

    // Only the exact requests the dashboard makes; see src/lib/proxyTargets.ts.
    const target = resolveProxyTarget(searchParams.get('url') ?? '');
    if (!target) {
        return refuse(403, 'Target not allowed');
    }

    const upstreamUrl = new URL(target.url);
    if (target.addApiKey) {
        const apiKey = process.env.AIRNOW_API_KEY;
        if (!apiKey) {
            return refuse(503, 'AirNow API key not configured');
        }
        upstreamUrl.searchParams.set('API_KEY', apiKey);
    }

    try {
        const response = await fetch(upstreamUrl, {
            redirect: 'error',                  // the allowlist is only as good as where we end up
            signal: AbortSignal.timeout(15000),
            // Keep the keyed forecast call in Next's server-side data cache, keyed by the rebuilt
            // URL, so however the proxy URL is varied, AirNow sees at most one call per zip per 5 min.
            ...(target.addApiKey ? { next: { revalidate: 300 } } : {}),
        });

        if (!response.ok) {
            // Pass the status through: the hourly loader rolls back an hour on a 404.
            return NextResponse.json(
                { error: `Failed to fetch from ${target.url.hostname}` },
                { status: response.status, headers: { 'X-Content-Type-Options': 'nosniff' } }
            );
        }

        const text = await response.text();

        return new NextResponse(text, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'X-Content-Type-Options': 'nosniff',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        });
    } catch (error) {
        // Log the host and error type only: the forecast URL carries the API key.
        const err = error as Error & { cause?: { code?: string } };
        console.error('Proxy upstream error:', target.url.hostname, err.name, err.cause?.code ?? '');
        return NextResponse.json(
            { error: 'Upstream unavailable' },
            { status: 502, headers: { 'X-Content-Type-Options': 'nosniff' } }
        );
    }
}
