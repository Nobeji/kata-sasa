"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function NewEventPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    startAt: "",
    endAt: "",
    venueName: "",
    venueAddress: "",
    timezone: "Africa/Dar_es_Salaam",
    capacity: 100,
    coverImage: "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onCoverUpload(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    set("coverImage", data.url);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        capacity: Number(form.capacity),
      }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Failed to create event");
      return;
    }
    router.push(`/dashboard/events/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Create event</h1>
      <p className="mt-1 text-sm text-slate-600">Add event details, then add ticket types and publish.</p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <label className="mb-1 block text-sm font-medium">Title</label>
          <input value={form.title} onChange={(e) => set("title", e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Description</label>
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={4} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Start</label>
            <input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">End</label>
            <input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Timezone</label>
          <input value={form.timezone} onChange={(e) => set("timezone", e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Venue name</label>
          <input value={form.venueName} onChange={(e) => set("venueName", e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Venue address</label>
          <input value={form.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Capacity</label>
            <input type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", Number(e.target.value))} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Cover image</label>
            <input value={form.coverImage} onChange={(e) => set("coverImage", e.target.value)} placeholder="https://... or upload below" />
            <input type="file" accept="image/*" className="mt-2" onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try { await onCoverUpload(f); } catch (err: unknown) { setError(err instanceof Error ? err.message : "Upload failed"); }
            }} />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={loading} className="bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-60">
            {loading ? "Creating..." : "Create event"}
          </button>
          <button type="button" onClick={() => router.back()} className="border border-slate-300 bg-white hover:bg-slate-50">Cancel</button>
        </div>
      </form>
    </div>
  );
}
