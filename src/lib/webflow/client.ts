const PROXY_BASE = "/api/webflow";

export class WebflowApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = "WebflowApiError";
  }
}

export async function webflowRequest<T>(
  path: string,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${PROXY_BASE}${path}`;
  const method = (options.method ?? "GET").toUpperCase();

  // Log every mutation to the browser console for easy debugging
  if (method !== "GET") {
    try {
      console.log(
        `[Webflow] ${method} ${path}`,
        options.body ? JSON.parse(options.body as string) : null
      );
    } catch { /* ignore parse errors */ }
  }

  const res = await fetch(url, {
    ...options,
    cache: "no-store",
    headers: {
      "x-webflow-token": token,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    let message = `Webflow API error: ${res.status} ${res.statusText}`;
    let code: string | undefined;
    try {
      const body = await res.json();
      if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        message = String(b.message ?? b.msg ?? b.error ?? message);
        code = b.code as string | undefined;

        // "problems" array  (e.g. field-level validation messages)
        if (Array.isArray(b.problems) && b.problems.length > 0) {
          message += ": " + (b.problems as string[]).join("; ");
        }

        // "errors" array  (another Webflow error shape)
        if (Array.isArray(b.errors) && b.errors.length > 0) {
          const errDetails = (b.errors as Record<string, unknown>[])
            .map((e) => e.message ?? e.msg ?? JSON.stringify(e))
            .join("; ");
          message += ": " + errDetails;
        }

        // "details" array — Webflow v2 validation format:
        // [{ param: "slug", description: "Unique value is already in database: '...'" }]
        if (Array.isArray(b.details) && b.details.length > 0) {
          const detailMsgs = (b.details as Record<string, unknown>[])
            .map((d) => d.param ? `${d.param}: ${d.description ?? d.message}` : String(d.description ?? d.message ?? JSON.stringify(d)))
            .join("; ");
          message += " — " + detailMsgs;
        }

        // Log the full error body so devs can inspect it
        console.error(`[Webflow] ${res.status} error on ${method} ${path}:`, body);
      }
    } catch {}

    if (res.status === 401) throw new WebflowApiError("Invalid API token.", 401, "UNAUTHORIZED");
    if (res.status === 403) throw new WebflowApiError("Insufficient permissions. Check your token has CMS: Read + Write access.", 403, "FORBIDDEN");
    if (res.status === 404) throw new WebflowApiError(message || "Resource not found.", 404, "NOT_FOUND");
    if (res.status === 409) throw new WebflowApiError(message || "Conflict.", 409, "CONFLICT");
    if (res.status === 422) throw new WebflowApiError(message || "Validation error. Check the field values and try again.", 422, "UNPROCESSABLE");
    if (res.status === 429) throw new WebflowApiError("Rate limit exceeded. Please wait before retrying.", 429, "RATE_LIMITED");
    if (res.status === 500) throw new WebflowApiError(
      message || "Webflow returned a server error.",
      500, "SERVER_ERROR"
    );

    throw new WebflowApiError(message, res.status, code);
  }

  if (res.status === 204) return {} as T;

  const data = await res.json();
  if (method !== "GET") {
    console.log(`[Webflow] ${method} ${path} → ${res.status}`, data);
  }
  return data as T;
}
