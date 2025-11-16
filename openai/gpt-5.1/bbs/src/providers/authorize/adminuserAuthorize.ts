import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminuserPayload } from "../../decorators/payload/AdminuserPayload";

/**
 * Authorize an adminuser based on JWT payload and database state.
 *
 * - Verifies JWT via shared jwtAuthorize helper
 * - Ensures the payload.type discriminator is "adminuser"
 * - Confirms the referenced admin user exists and is active (not soft-deleted)
 */
export async function adminuserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<AdminuserPayload> {
  const payload: AdminuserPayload = jwtAuthorize({ request }) as AdminuserPayload;

  if (payload.type !== "adminuser")
    throw new ForbiddenException("You're not an adminuser");

  // payload.id is the top-level admin user id (discussion_board_adminusers.id)
  const adminUser = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      account_status: "active",
    },
  });

  if (adminUser === null)
    throw new ForbiddenException("You're not enrolled as an active adminuser");

  // Validate that the session in the payload is still valid
  const session = await MyGlobal.prisma.discussion_board_adminuser_sessions.findFirst({
    where: {
      id: payload.session_id,
      discussion_board_adminuser_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null)
    throw new ForbiddenException("Adminuser session is invalid or expired");

  return payload;
}
