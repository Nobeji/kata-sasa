import { z } from "zod";

export const checkinSchema = z.object({
  qrCode: z.string().min(8),
  eventId: z.string().min(1),
  deviceInfo: z.string().max(500).optional().nullable(),
});
