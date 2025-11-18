import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminuserPayload } from "../../decorators/payload/AdminuserPayload";

/**
 * Authorize an administrative user based on JWT payload and database/session state.
 */
export async function adminuserAuthorize(request: {
  headers: { authorization?: string };
}): Promise<AdminuserPayload> {
  const payload: AdminuserPayload = jwtAuthorize({ request }) as AdminuserPayload;

  if (payload.type !== "admin")
    throw new ForbiddenException("You're not admin");

  // Verify admin user existence and active status
  const adminUser = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (adminUser === null)
    throw new ForbiddenException("You're not enrolled as admin user");

  // Verify the admin session belongs to this admin and is valid
  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_adminuser_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null)
    throw new ForbiddenException("Admin session is invalid or expired");

  return payload;
}
