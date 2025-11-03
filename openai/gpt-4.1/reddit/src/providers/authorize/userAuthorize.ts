import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authentication provider for the 'user' role. Verifies JWT and ensures active user.
 * @param request Incoming HTTP request containing Authorization header
 * @returns Authenticated user payload
 */
export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // 'payload.id' is the top-level community_platform_users.id
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
