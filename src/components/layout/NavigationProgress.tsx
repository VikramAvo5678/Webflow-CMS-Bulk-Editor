"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type State = "idle" | "loading" | "done";

export function NavigationProgress() {
  const pathname = usePathname();
  const [state, setState] = useState<State>("idle");
  const [width, setWidth] = useState(0);
  const doneTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const advanceTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Detect link clicks BEFORE navigation resolves — start bar immediately
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const a = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      try {
        const url = new URL(a.href, window.location.href);
        if (url.origin !== window.location.origin) return; // external
        if (a.target === "_blank") return;
        if (url.pathname === pathname) return; // same page
      } catch { return; }

      setState("loading");
      setWidth(15);
    }
    document.addEventListener("click", onLinkClick, true);
    return () => document.removeEventListener("click", onLinkClick, true);
  }, [pathname]);

  // Slowly advance the bar while waiting for the page to render
  useEffect(() => {
    if (state !== "loading") return;
    const t1 = setTimeout(() => setWidth(40), 120);
    const t2 = setTimeout(() => setWidth(65), 500);
    const t3 = setTimeout(() => setWidth(80), 1200);
    advanceTimers.current = [t1, t2, t3];
    return () => advanceTimers.current.forEach(clearTimeout);
  }, [state]);

  // Pathname changed → navigation complete → finish and hide bar
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    advanceTimers.current.forEach(clearTimeout);
    setWidth(100);
    setState("done");
    clearTimeout(doneTimer.current);
    doneTimer.current = setTimeout(() => { setState("idle"); setWidth(0); }, 450);
    return () => clearTimeout(doneTimer.current);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "idle") return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999] h-[3px] bg-primary"
      style={{
        width: `${width}%`,
        boxShadow: "0 0 8px 0 hsl(var(--primary) / 0.6)",
        transition:
          state === "done"
            ? "width 180ms ease-out, opacity 250ms ease-in 200ms"
            : "width 500ms ease-out",
        opacity: state === "done" ? 0 : 1,
      }}
    />
  );
}
