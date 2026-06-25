import { webflowRequest, WebflowApiError } from "./client";
import {
  WebflowItem,
  WebflowPaginatedResponse,
  CreateItemPayload,
  UpdateItemPayload,
} from "@/types/webflow";

export async function getItems(
  token: string,
  collectionId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<WebflowPaginatedResponse<WebflowItem>> {
  const params = new URLSearchParams();
  params.set("limit", String(options.limit ?? 100));
  if (options.offset) params.set("offset", String(options.offset));

  const raw = await webflowRequest<unknown>(
    `/collections/${collectionId}/items?${params}`,
    token
  );

  // Normalise response — Webflow v2 returns { items, pagination } but guard
  // against shape variations.
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    const items = Array.isArray(r.items) ? (r.items as WebflowItem[]) : [];
    const pagination = (r.pagination as WebflowPaginatedResponse<WebflowItem>["pagination"]) ?? {
      limit: items.length,
      offset: 0,
      total: items.length,
    };
    return { items, pagination };
  }

  return { items: [], pagination: { limit: 0, offset: 0, total: 0 } };
}

export async function createItem(
  token: string,
  collectionId: string,
  payload: CreateItemPayload
): Promise<WebflowItem> {
  return webflowRequest<WebflowItem>(`/collections/${collectionId}/items`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateItem(
  token: string,
  collectionId: string,
  itemId: string,
  payload: UpdateItemPayload
): Promise<WebflowItem> {
  return webflowRequest<WebflowItem>(`/collections/${collectionId}/items/${itemId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteItem(
  token: string,
  collectionId: string,
  itemId: string
): Promise<void> {
  const stagingUrl = `/collections/${collectionId}/items/${itemId}`;
  const liveUrl    = `/collections/${collectionId}/items/${itemId}/live`;

  // Attempt 1: delete from staging directly (works for draft items).
  try {
    await webflowRequest(stagingUrl, token, { method: "DELETE" });
    return; // done — draft item fully removed
  } catch (err) {
    // 500 means the item is published; anything else is a real error.
    if (!(err instanceof WebflowApiError) || err.status !== 500) throw err;
  }

  // The item is published → remove from the live site first.
  try {
    await webflowRequest(liveUrl, token, { method: "DELETE" });
  } catch (err) {
    // 404 = item wasn't live despite being "published" — continue anyway.
    if (!(err instanceof WebflowApiError) || err.status !== 404) throw err;
  }

  // Webflow needs a moment to propagate the unpublish before the staging
  // record can be deleted — without this delay the staging DELETE returns 500.
  await new Promise((r) => setTimeout(r, 1000));

  // Attempt 2: delete staging record (now in draft state after unpublish).
  await webflowRequest(stagingUrl, token, { method: "DELETE" });
}

export async function publishItems(
  token: string,
  collectionId: string,
  itemIds: string[]
): Promise<{ publishedItemIds: string[]; errors: unknown[] }> {
  return webflowRequest(`/collections/${collectionId}/items/publish`, token, {
    method: "POST",
    body: JSON.stringify({ itemIds }),
  });
}

export async function bulkCreateItems(
  token: string,
  collectionId: string,
  items: CreateItemPayload[]
): Promise<{ createdItems: WebflowItem[]; errors: unknown[] }> {
  return webflowRequest(`/collections/${collectionId}/items/bulk`, token, {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export async function bulkDeleteItems(
  token: string,
  collectionId: string,
  itemIds: string[]
): Promise<void> {
  await webflowRequest(`/collections/${collectionId}/items`, token, {
    method: "DELETE",
    body: JSON.stringify({ itemIds }),
  });
}
