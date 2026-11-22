import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Role } from "@prisma/client";

export function ok(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function err(message: string, status = 400, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return err("Validation failed", 400, { issues: error.flatten() });
  }
  console.error(error);
  return err("Internal server error", 500);
}

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return session;
}

export async function requireRole(roles: Role[]) {
  const session = await requireSession();
  if (!session) return { session: null, response: err("Unauthorized", 401) as NextResponse };
  if (!roles.includes(session.user.role)) {
    return { session: null, response: err("Forbidden", 403) as NextResponse };
  }
  return { session, response: null as NextResponse | null };
}
