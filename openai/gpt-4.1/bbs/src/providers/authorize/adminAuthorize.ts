import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authorization provider for admin authentication.
 *
 * Verifies JWT, checks admin role, validates soft deletion, and confirms admin existence.
 * Throws ForbiddenException if criteria are unmet.
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

  // Check for active admin (not soft-deleted)
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });
  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or admin account is deactivated");
  }

  return payload;
}
