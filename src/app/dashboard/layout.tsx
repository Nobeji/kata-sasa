import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const role = session.user.role;
  const canManage = role === "ADMIN" || role === "ORGANIZER";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-bold text-slate-950">Kata Sasa</Link>
          <nav className="flex items-center gap-4 text-sm">
            {canManage && <Link href="/dashboard/events" className="text-slate-700 hover:text-slate-950">Events</Link>}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{session.user.email} · {role}</span>
            <Link href="/api/auth/signout" className="text-slate-500 hover:text-slate-900">Sign out</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
