import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
        return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
    }

    try {
        const parsedUrl = new URL(targetUrl);
        const whitelist = ['s3-us-west-1.amazonaws.com', 'www.airnowapi.org', 'airnowapi.org', 'arcgis.com'];
        
        if (!whitelist.some(domain => parsedUrl.hostname.endsWith(domain))) {
            return NextResponse.json({ error: 'Unauthorized target domain' }, { status: 403 });
        }

        // Inject API Key for AirNow API requests if missing
        if (parsedUrl.hostname.includes('airnowapi.org') && !parsedUrl.searchParams.has('API_KEY')) {
            const apiKey = process.env.AIRNOW_API_KEY;
            if (apiKey) {
                parsedUrl.searchParams.set('API_KEY', apiKey);
            }
        }

        const response = await fetch(parsedUrl.toString());

        if (!response.ok) {
            return NextResponse.json(
                { error: `Failed to fetch from ${parsedUrl.hostname}` },
                { status: response.status }
            );
        }

        const text = await response.text();

        return new NextResponse(text, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
            }
        });
    } catch (error) {
        console.error('Proxy Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
