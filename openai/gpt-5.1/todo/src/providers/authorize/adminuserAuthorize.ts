import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminuserPayload } from "../../decorators/payload/AdminuserPayload";

/**
 * Authorize an administrative user based on JWT payload and active session.
 *
 * - Verifies JWT via shared jwtAuthorize utility
 * - Ensures the payload type is strictly "adminUser"
 * - Confirms the underlying admin user exists
 * - Confirms the referenced session exists for that admin
 */
export async function adminuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminuserPayload> {
  const payload: AdminuserPayload = jwtAuthorize({ request }) as AdminuserPayload;

  if (payload.type !== "adminUser")
    throw new ForbiddenException("You're not adminUser");

  // payload.id is the top-level admin user ID in todo_app_adminusers
  const adminUser = await MyGlobal.prisma.todo_app_adminusers.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (adminUser === null)
    throw new ForbiddenException("You're not enrolled as admin user");

  // Verify that the session exists and belongs to this admin user
  const session = await MyGlobal.prisma.todo_app_adminuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_adminuser_id: payload.id,
    },
  });

  if (session === null)
    throw new ForbiddenException("Session is not valid for this admin user");

  return payload;
}
