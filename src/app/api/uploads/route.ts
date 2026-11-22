import { NextRequest } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { err, ok, requireRole } from "@/lib/api";
import { EVENT_MANAGER_ROLES } from "@/lib/rbac";
import { randomBytes } from "crypto";

export async function POST(req: NextRequest) {
  const { response } = await requireRole(EVENT_MANAGER_ROLES);
  if (response) return response;

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return err("File is required", 400);
  if (!file.type.startsWith("image/")) return err("Only image uploads are allowed", 400);

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);

  return ok({ url: `/uploads/${name}` });
}
