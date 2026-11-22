import { Role } from "@prisma/client";

export const EVENT_MANAGER_ROLES: Role[] = [Role.ADMIN, Role.ORGANIZER];
export const SCAN_ROLES: Role[] = [Role.ADMIN, Role.ORGANIZER, Role.SCANNER];

export function canManageEvent(userRole: Role, organizerId: string, userId: string) {
  if (userRole === Role.ADMIN) return true;
  return userRole === Role.ORGANIZER && organizerId === userId;
}
