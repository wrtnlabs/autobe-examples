import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Verifies JWT and ensures the admin session and account are valid and active.
 */
export async function adminAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminPayload> {
  const payload = jwtAuthorize({ request }) as AdminPayload;

  if (payload.type !== "admin") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Validate session belongs to the admin and admin is active (not soft-deleted).
  const session = await MyGlobal.prisma.todo_app_admin_sessions.findFirst({
    where: {
      id: payload.session_id,
      admin: {
        id: payload.id,
        deleted_at: null,
        is_active: true,
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
