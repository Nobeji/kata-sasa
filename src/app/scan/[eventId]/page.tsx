"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Html5Qrcode } from "html5-qrcode";
import { cacheEventTokens, getCachedToken, getQueuedCheckins, markTokenCheckedInLocally, queueCheckin, removeQueuedCheckin } from "@/lib/checkin/offline";

type ScanResult = {
  result: "SUCCESS" | "INVALID" | "WRONG_EVENT" | "ALREADY_CHECKED_IN" | "OFFLINE_QUEUED" | "ERROR";
  message: string;
  holderName?: string;
  ticketType?: string;
  checkedInAt?: string;
};

function beep(success: boolean) {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = success ? 880 : 220;
    gain.gain.value = 0.1;
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch {}
}

function vibrate(pattern: number | number[]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

export default function ScanPage() {
  const params = useParams<{ eventId: string }>();
  const eventId = params.eventId;
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "unauthenticated") router.replace(`/login?callbackUrl=/scan/${eventId}`);
  }, [status, router, eventId]);
  const [eventTitle, setEventTitle] = useState("");
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [cameraError, setCameraError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<{ code: string; at: number } | null>(null);
  const syncingRef = useRef(false);

  const refreshQueueCount = useCallback(async () => {
    const q = await getQueuedCheckins();
    setQueuedCount(q.filter((i) => i.eventId === eventId).length);
  }, [eventId]);

  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const q = await getQueuedCheckins();
      for (const item of q.filter((i) => i.eventId === eventId)) {
        try {
          const res = await fetch("/api/checkin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ qrCode: item.qrCode, eventId: item.eventId, deviceInfo: item.deviceInfo }),
          });
          if (res.ok) {
            await removeQueuedCheckin(item.id);
          }
        } catch {
          // keep in queue
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
      await refreshQueueCount();
    }
  }, [eventId, refreshQueueCount]);

  const loadTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/scan-tokens`);
      if (!res.ok) return;
      const data = await res.json();
      setEventTitle(data.event?.title || "");
      await cacheEventTokens(eventId, data.tokens || []);
    } catch {
      // offline - use cached
    }
  }, [eventId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => { setOnline(true); syncQueue(); loadTokens(); };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    loadTokens();
    refreshQueueCount();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [loadTokens, refreshQueueCount, syncQueue]);

  const handleScan = useCallback(async (qrCode: string) => {
    const now = Date.now();
    if (lastScanRef.current && lastScanRef.current.code === qrCode && now - lastScanRef.current.at < 3000) return;
    lastScanRef.current = { code: qrCode, at: now };

    const deviceInfo = navigator.userAgent;

    // Try online first
    if (navigator.onLine) {
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode, eventId, deviceInfo }),
        });
        const data = await res.json();
        if (res.ok) {
          const result = data.result as ScanResult["result"];
          if (result === "SUCCESS") {
            await markTokenCheckedInLocally(eventId, qrCode);
            beep(true); vibrate([100]);
            setLastResult({ result, message: "Check-in successful", holderName: data.holderName, ticketType: data.ticketType });
          } else if (result === "ALREADY_CHECKED_IN") {
            await markTokenCheckedInLocally(eventId, qrCode);
            beep(false); vibrate([60, 40, 60]);
            setLastResult({ result, message: "Already checked in", checkedInAt: data.checkedInAt });
          } else if (result === "WRONG_EVENT") {
            beep(false); vibrate([200, 50, 200]);
            setLastResult({ result, message: "Wrong event" });
          } else {
            beep(false); vibrate([200, 50, 200]);
            setLastResult({ result: "INVALID", message: "Invalid ticket" });
          }
          return;
        }
      } catch {
        // fall through to offline
      }
    }

    // Offline / network failure fallback
    const cached = await getCachedToken(eventId, qrCode);
    if (!cached) {
      beep(false); vibrate([200, 50, 200]);
      setLastResult({ result: "INVALID", message: navigator.onLine ? "Invalid ticket" : "Invalid ticket (offline cache)" });
      return;
    }
    if (cached.status === "CHECKED_IN") {
      beep(false); vibrate([60, 40, 60]);
      setLastResult({ result: "ALREADY_CHECKED_IN", message: "Already checked in (offline)", checkedInAt: cached.checkedInAt || undefined, holderName: cached.holderName, ticketType: cached.ticketType });
      return;
    }

    await markTokenCheckedInLocally(eventId, qrCode);
    await queueCheckin({ id: crypto.randomUUID(), eventId, qrCode, deviceInfo, createdAt: new Date().toISOString() });
    await refreshQueueCount();
    beep(true); vibrate([100]);
    setLastResult({ result: "OFFLINE_QUEUED", message: "Checked in offline — will sync", holderName: cached.holderName, ticketType: cached.ticketType });
  }, [eventId, refreshQueueCount]);

  useEffect(() => {
    let mounted = true;
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => { if (mounted) handleScan(decodedText); },
      () => {}
    ).catch((e) => {
      if (mounted) setCameraError(String(e));
    });

    return () => {
      mounted = false;
      scanner.stop().catch(() => {}).finally(() => { Promise.resolve(scanner.clear()).catch(() => {}); });
    };
  }, [handleScan]);

  const bg = lastResult?.result === "SUCCESS" || lastResult?.result === "OFFLINE_QUEUED"
    ? "bg-green-600"
    : lastResult?.result === "ALREADY_CHECKED_IN"
    ? "bg-yellow-500"
    : lastResult
    ? "bg-red-600"
    : "bg-slate-900";

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Check-in Scanner</h1>
            <p className="text-sm text-slate-300">{eventTitle || "Event"} · {online ? "Online" : "Offline"}</p>
          </div>
          <div className="text-right text-xs text-slate-300">
            <div>{queuedCount} queued</div>
            <button onClick={syncQueue} disabled={syncing || !online} className="mt-1 rounded bg-white/10 px-2 py-1 hover:bg-white/20 disabled:opacity-50">
              {syncing ? "Syncing..." : "Sync"}
            </button>
          </div>
        </div>

        <div className={`mb-4 rounded-2xl p-6 text-center ${bg}`}>
          <p className="text-2xl font-bold">{lastResult ? lastResult.result : "READY"}</p>
          <p className="mt-2 text-sm opacity-95">{lastResult?.message || "Scan a ticket QR code"}</p>
          {lastResult?.holderName && <p className="mt-2 font-medium">{lastResult.holderName} {lastResult.ticketType ? `· ${lastResult.ticketType}` : ""}</p>}
          {lastResult?.checkedInAt && <p className="text-xs opacity-90">Checked in at: {new Date(lastResult.checkedInAt).toLocaleString()}</p>}
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
          <div id="qr-reader" className="w-full" />
        </div>
        {cameraError && <p className="mt-3 text-sm text-red-300">Camera error: {cameraError}</p>}

        <p className="mt-4 text-xs text-slate-400">Offline mode: valid tickets are cached locally. Check-ins are queued and synced when connection returns.</p>
      </div>
    </main>
  );
}
