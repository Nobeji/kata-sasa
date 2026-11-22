import { z } from "zod";

export const createInvitationsSchema = z.object({
  eventId: z.string().min(1),
  templateId: z.enum(["elegant", "modern", "minimal"]),
  guests: z.array(z.object({
    name: z.string().min(1).max(120),
    email: z.string().email(),
  })).min(1).max(500),
});

export const sendInvitationsSchema = z.object({
  eventId: z.string().min(1),
  invitationIds: z.array(z.string().min(1)).optional(),
  sendAllPending: z.boolean().optional(),
}).refine((v) => (v.invitationIds && v.invitationIds.length > 0) || v.sendAllPending, {
  message: "Provide invitationIds or set sendAllPending=true",
});

export const rsvpSchema = z.object({
  rsvpStatus: z.enum(["ATTENDING", "DECLINED"]),
});
