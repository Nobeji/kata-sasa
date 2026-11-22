import { z } from "zod";

export const createEventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(5000).optional().nullable(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  venueName: z.string().min(2).max(200),
  venueAddress: z.string().max(300).optional().nullable(),
  timezone: z.string().min(2).default("Africa/Dar_es_Salaam"),
  capacity: z.number().int().positive(),
  coverImage: z.string().url().optional().nullable().or(z.literal("")),
});

export const updateEventSchema = createEventSchema.partial().extend({
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED", "ENDED"]).optional(),
});

export const createTicketTypeSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().int().min(0),
  currency: z.string().min(3).max(10).default("TZS"),
  quantity: z.number().int().positive(),
  saleStart: z.string().datetime().optional().nullable(),
  saleEnd: z.string().datetime().optional().nullable(),
});
