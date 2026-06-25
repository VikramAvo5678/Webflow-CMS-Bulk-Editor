import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token  = formData.get("token")  as string | null;
    const siteId = formData.get("siteId") as string | null;
    const file   = formData.get("file")   as File   | null;

    if (!token || !siteId || !file) {
      return NextResponse.json({ error: "Missing token, siteId, or file" }, { status: 400 });
    }

    // MD5 of the file — required by Webflow Assets API
    const bytes = await file.arrayBuffer();
    const hash  = createHash("md5").update(Buffer.from(bytes)).digest("hex");

    // Step 1 — ask Webflow for a pre-signed S3 upload URL
    const initRes = await fetch(`https://api.webflow.com/v2/sites/${siteId}/assets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileName: file.name, fileHash: hash }),
    });

    if (!initRes.ok) {
      const text = await initRes.text();
      // Extract the human-readable message from Webflow's JSON error body
      let message = text;
      try {
        const body = JSON.parse(text);
        message = body.message ?? body.msg ?? text;
        // Strip "OAuthForbidden: " prefix if present
        message = String(message).replace(/^OAuthForbidden:\s*/i, "");
        if (initRes.status === 403 && message.includes("assets:write")) {
          message = "Your API token is missing the 'assets:write' scope. Go to Webflow → Workspace Settings → Integrations → API Tokens and add the Assets: Write permission.";
        }
      } catch { /* leave message as raw text */ }
      return NextResponse.json({ error: message }, { status: initRes.status });
    }

    const { uploadUrl, uploadDetails, id, hostedUrl } = (await initRes.json()) as {
      uploadUrl: string;
      uploadDetails: Record<string, string>;
      id: string;
      hostedUrl: string;
    };

    // Step 2 — upload file to S3 (file must be the LAST field per AWS spec)
    const s3Form = new FormData();
    for (const [k, v] of Object.entries(uploadDetails)) s3Form.append(k, v);
    s3Form.append("file", new Blob([bytes], { type: file.type }), file.name);

    const s3Res = await fetch(uploadUrl, { method: "POST", body: s3Form });
    // S3 returns 201 on success; some configs return 204
    if (!s3Res.ok && s3Res.status !== 201 && s3Res.status !== 204) {
      const text = await s3Res.text();
      return NextResponse.json({ error: `S3 upload failed: ${text}` }, { status: 500 });
    }

    return NextResponse.json({ id, url: hostedUrl, alt: "" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 },
    );
  }
}
