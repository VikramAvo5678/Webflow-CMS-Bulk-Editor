import { webflowRequest } from "./client";
import { WebflowSite } from "@/types/webflow";

export async function getSites(token: string): Promise<WebflowSite[]> {
  const data = await webflowRequest<{ sites: WebflowSite[] }>("/sites", token);
  return data.sites ?? [];
}

export async function getSite(token: string, siteId: string): Promise<WebflowSite> {
  return webflowRequest<WebflowSite>(`/sites/${siteId}`, token);
}
