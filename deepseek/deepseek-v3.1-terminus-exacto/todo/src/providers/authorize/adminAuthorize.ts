import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Verifies admin JWT token, validates role and system status, and returns authenticated payload if valid session & admin credentials.
 * Throws ForbiddenException if admin is not enrolled, locked, or soft-deleted.
 * Strictly checks for active, unlocked, and undeleted status.
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload: AdminPayload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate admin status by presence, lock state, and deletion
  const admin = await MyGlobal.prisma.todo_list_admins.findFirst({
    where: {
      id: payload.id,
      locked: false,
      deleted_at: null,
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or are inactive.");
  }

  // Validate admin session ownership (optional extra strictness)
  const session = await MyGlobal.prisma.todo_list_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      admin_id: payload.id,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session is not valid for this admin.");
  }

  return payload;
}
