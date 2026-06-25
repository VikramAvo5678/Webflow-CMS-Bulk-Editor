import { webflowRequest } from "./client";
import {
  WebflowCollection,
  WebflowField,
  CreateCollectionPayload,
  UpdateCollectionPayload,
  CreateFieldPayload,
  UpdateFieldPayload,
} from "@/types/webflow";

// Webflow v2 wraps collections in { collections: [...] } but guard against
// an array response too just in case the shape changes.
function extractArray<T>(data: unknown, key: string): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object" && key in (data as object)) {
    const val = (data as Record<string, unknown>)[key];
    if (Array.isArray(val)) return val as T[];
  }
  return [];
}

export async function getCollections(token: string, siteId: string): Promise<WebflowCollection[]> {
  const data = await webflowRequest<unknown>(`/sites/${siteId}/collections`, token);
  return extractArray<WebflowCollection>(data, "collections");
}

export async function getCollection(token: string, collectionId: string): Promise<WebflowCollection> {
  return webflowRequest<WebflowCollection>(`/collections/${collectionId}`, token);
}

export async function createCollection(
  token: string,
  siteId: string,
  payload: CreateCollectionPayload
): Promise<WebflowCollection> {
  return webflowRequest<WebflowCollection>(`/sites/${siteId}/collections`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateCollection(
  token: string,
  collectionId: string,
  payload: UpdateCollectionPayload
): Promise<WebflowCollection> {
  return webflowRequest<WebflowCollection>(`/collections/${collectionId}`, token, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteCollection(token: string, collectionId: string): Promise<void> {
  await webflowRequest(`/collections/${collectionId}`, token, { method: "DELETE" });
}

export async function getCollectionFields(
  token: string,
  collectionId: string
): Promise<WebflowField[]> {
  // Webflow API v2 embeds fields inside the collection detail — there is no
  // separate GET /collections/{id}/fields list endpoint.
  const col = await webflowRequest<WebflowCollection>(`/collections/${collectionId}`, token);
  return col.fields ?? [];
}

export async function createField(
  token: string,
  collectionId: string,
  payload: CreateFieldPayload
): Promise<WebflowField> {
  return webflowRequest<WebflowField>(`/collections/${collectionId}/fields`, token, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateField(
  token: string,
  collectionId: string,
  fieldId: string,
  payload: UpdateFieldPayload
): Promise<WebflowField> {
  // Webflow API v2 returns 404 if `type` is included in a PATCH body
  // (field type cannot be changed after creation)
  const { type: _type, ...safePayload } = payload as UpdateFieldPayload & { type?: unknown };
  return webflowRequest<WebflowField>(`/collections/${collectionId}/fields/${fieldId}`, token, {
    method: "PATCH",
    body: JSON.stringify(safePayload),
  });
}

export async function deleteField(
  token: string,
  collectionId: string,
  fieldId: string
): Promise<void> {
  await webflowRequest(`/collections/${collectionId}/fields/${fieldId}`, token, {
    method: "DELETE",
  });
}
