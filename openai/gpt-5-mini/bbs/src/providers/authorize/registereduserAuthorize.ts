// File: src/providers/authorize/registereduserAuthorize.ts
import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegistereduserPayload } from "../../decorators/payload/RegistereduserPayload";

/**
 * Verifies request JWT and ensures the payload represents an active
 * registered user.
 */
export async function registereduserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<RegistereduserPayload> {
  const payload: RegistereduserPayload = jwtAuthorize({ request }) as RegistereduserPayload;

  if (payload.type !== "registereduser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // The registered user model is the top-level user entity; payload.id is the registered user id.
  const user = await MyGlobal.prisma.econ_political_forum_registereduser.findFirst({
    where: {
      id: payload.id,
      // Validate account is active / not soft-deleted or banned
      deleted_at: null,
      is_banned: false,
    },
    select: { id: true },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
