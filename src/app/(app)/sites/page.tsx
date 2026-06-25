"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Globe, Loader2, CheckCircle2, AlertCircle, ArrowRight, Eye, EyeOff, ChevronDown, ChevronUp,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useConnectionStore } from "@/store/connection";
import { getSites, getSite } from "@/lib/webflow/sites";
import { WebflowSite } from "@/types/webflow";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";

export default function SitesPage() {
  const router = useRouter();
  const { token, setToken, setSelectedSite, selectedSiteId } = useConnectionStore();

  const [inputToken, setInputToken] = useState(token ?? "");
  const [showToken, setShowToken] = useState(false);
  const [sites, setSites] = useState<WebflowSite[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);

  // Manual site ID fallback
  const [manualSiteId, setManualSiteId] = useState("");
  const [manualSiteName, setManualSiteName] = useState("");
  const [manualLoading, setManualLoading] = useState(false);

  async function handleConnect() {
    if (!inputToken.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setToken(inputToken.trim());
      const data = await getSites(inputToken.trim());
      setSites(data);
      setFetched(true);
      toast({ title: `Found ${data.length} site${data.length !== 1 ? "s" : ""}` });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      // If 403, save the token and prompt manual entry
      if (err instanceof Error && msg.includes("permissions")) {
        setToken(inputToken.trim());
        setError(
          "Your token doesn't have Sites: Read permission. Enter your Site ID manually below, or add the Sites scope to your token."
        );
        setShowManual(true);
      } else {
        setError(msg);
      }
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function handleManualConnect() {
    if (!manualSiteId.trim() || !inputToken.trim()) return;
    setManualLoading(true);
    try {
      // Try to fetch the specific site to validate the ID
      let name = manualSiteName.trim();
      try {
        const site = await getSite(inputToken.trim(), manualSiteId.trim());
        name = site.displayName;
      } catch {
        // If we can't fetch the site either, just use the provided name
        if (!name) name = manualSiteId.trim();
      }
      setToken(inputToken.trim());
      setSelectedSite(manualSiteId.trim(), name);
      toast({ title: `Connected to ${name}` });
      router.push("/collections");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to connect";
      toast({ title: "Connection failed", description: msg, variant: "destructive" });
    } finally {
      setManualLoading(false);
    }
  }

  function handleSelectSite(site: WebflowSite) {
    setSelectedSite(site.id, site.displayName);
    toast({ title: `Connected to ${site.displayName}` });
    router.push("/collections");
  }

  return (
    <div>
      <Header title="Sites" subtitle="Connect your Webflow API token and select a site" />

      <div className="p-6 max-w-2xl space-y-5">
        {/* Token input card */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold">API Token</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter your Webflow API token. Find it in{" "}
            <span className="font-medium text-foreground">
              Workspace Settings → Integrations → API Tokens
            </span>.
          </p>

          {/* Permissions hint */}
          <div className="mt-3 rounded-md bg-muted/60 px-3 py-2.5 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Required token permissions:</p>
            <ul className="space-y-0.5 list-disc list-inside">
              <li><span className="font-mono">Sites: Read</span> — to list your sites</li>
              <li><span className="font-mono">CMS: Read + Write</span> — to manage collections &amp; items</li>
            </ul>
            <p className="mt-1.5">
              If your token only has <span className="font-mono">CMS</span> access, use the{" "}
              <button
                className="underline hover:text-foreground"
                onClick={() => setShowManual(true)}
              >
                manual Site ID
              </button>{" "}
              option below.
            </p>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <Label htmlFor="token">API Token</Label>
              <div className="relative mt-1.5">
                <Input
                  id="token"
                  type={showToken ? "text" : "password"}
                  placeholder="wf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={inputToken}
                  onChange={(e) => setInputToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleConnect()}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowToken(!showToken)}
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button onClick={handleConnect} disabled={loading || !inputToken.trim()}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
              ) : (
                <><Globe className="h-4 w-4" /> Fetch Sites</>
              )}
            </Button>
          </div>
        </div>

        {/* Manual Site ID fallback */}
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <button
            className="flex w-full items-center justify-between px-5 py-3.5 text-sm font-medium hover:bg-muted/40 transition-colors"
            onClick={() => setShowManual(!showManual)}
          >
            <span>Enter Site ID manually</span>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              Use if token lacks Sites permission
              {showManual ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
          </button>

          {showManual && (
            <div className="border-t border-border px-5 pb-5 pt-4 space-y-3">
              <p className="text-xs text-muted-foreground">
                Find your Site ID in{" "}
                <span className="font-medium text-foreground">
                  Site Settings → General → Site ID
                </span>{" "}
                (a string like <span className="font-mono">6426…</span>).
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="site-id">Site ID</Label>
                  <Input
                    id="site-id"
                    placeholder="6426f6a2b8…"
                    value={manualSiteId}
                    onChange={(e) => setManualSiteId(e.target.value)}
                    className="mt-1.5 font-mono text-sm"
                  />
                </div>
                <div>
                  <Label htmlFor="site-name">Display Name <span className="text-muted-foreground">(optional)</span></Label>
                  <Input
                    id="site-name"
                    placeholder="My Site"
                    value={manualSiteName}
                    onChange={(e) => setManualSiteName(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
              </div>
              <Button
                onClick={handleManualConnect}
                disabled={manualLoading || !manualSiteId.trim() || !inputToken.trim()}
                variant="outline"
              >
                {manualLoading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Connecting…</>
                ) : (
                  <>Connect with Site ID <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Auto-fetched sites list */}
        {fetched && sites.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Available Sites
            </h2>
            <div className="space-y-2">
              {sites.map((site) => (
                <div
                  key={site.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card p-4 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10">
                      <Globe className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{site.displayName}</p>
                        {selectedSiteId === site.id && (
                          <Badge variant="success" className="text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{site.shortName}.webflow.io</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {formatDate(site.lastUpdated)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedSiteId === site.id ? "secondary" : "default"}
                    onClick={() => handleSelectSite(site)}
                  >
                    {selectedSiteId === site.id ? (
                      <><CheckCircle2 className="h-4 w-4" /> Selected</>
                    ) : (
                      <>Select <ArrowRight className="h-4 w-4" /></>
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
