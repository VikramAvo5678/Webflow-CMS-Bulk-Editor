import { NextRequest, NextResponse } from "next/server";

// Force dynamic — never let Next.js cache this route handler
export const dynamic = "force-dynamic";

const WEBFLOW_API = "https://api.webflow.com/v2";

async function proxy(req: NextRequest, params: { path: string[] }) {
  const path = params.path.join("/");
  const url = `${WEBFLOW_API}/${path}${req.nextUrl.search}`;

  const token =
    req.headers.get("x-webflow-token") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing API token" }, { status: 401 });
  }

  const headers: HeadersInit = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    // Do NOT send Cache-Control/Pragma to Webflow — some CDN layers
    // treat them as hints and serve stale/incorrect responses.
  };

  let body: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(req.method)) {
    const text = await req.text();
    if (text) {
      body = text;
      // Server-side log so we can see the exact payload in the terminal
      try {
        console.log(`[proxy] ${req.method} /${path}`, JSON.parse(text));
      } catch {
        console.log(`[proxy] ${req.method} /${path} (non-JSON body)`);
      }
    }
  }

  const res = await fetch(url, { method: req.method, headers, body, cache: "no-store" });

  let data: unknown = null;
  if (res.status !== 204) {
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text.slice(0, 400) || `${res.status} ${res.statusText}` };
    }
    if (!res.ok) {
      console.error(`[proxy] Webflow ${res.status} on ${req.method} /${path}:`, data);
    }
  }

  return NextResponse.json(data, {
    status: res.status,
    headers: {
      // Prevent the browser from caching proxy responses too
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}

export const GET = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p));
export const POST = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p));
export const PATCH = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p));
export const PUT = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p));
export const DELETE = (req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) =>
  params.then((p) => proxy(req, p));
