import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { AdminPayload } from "../../decorators/payload/AdminPayload";

/**
 * Authenticates and authorizes a system administrator (admin) using JWT token.
 * Verifies admin status, lock, and deletion states against the `discussion_board_admins` table.
 *
 * @param request HTTP request with Bearer token in the headers
 * @returns Authenticated AdminPayload
 * @throws ForbiddenException if not an admin, locked/deleted, or not enrolled
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

  // payload.id is always the admin table primary key (discussion_board_admins.id)
  const admin = await MyGlobal.prisma.discussion_board_admins.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      is_locked: false
    },
  });

  if (admin === null) {
    throw new ForbiddenException("You're not enrolled or your account is locked/deleted");
  }

  return payload;
}
