import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authorization provider for discussion board users.
 * - Verifies JWT and user session.
 * - Ensures the user is not locked or deleted.
 * - Returns payload upon successful validation.
 */
export async function userAuthorize(request: {
  headers: { authorization?: string };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not a user.`);
  }

  // Fetch user with active session, not locked, not soft deleted
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: payload.id,
      is_locked: false,
      deleted_at: null
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled or the account is inactive.");
  }

  return payload;
}
