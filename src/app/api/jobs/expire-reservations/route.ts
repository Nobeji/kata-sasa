import { NextRequest } from "next/server";
import { ok, err } from "@/lib/api";
import { expireReservations } from "@/lib/jobs/expire-reservations";

export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) return err("Unauthorized", 401);
  }
  const result = await expireReservations();
  return ok(result);
}
