import { ForbiddenException, UnauthorizedException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const userSession = await MyGlobal.prisma.economic_forum_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      user: {
        id: payload.id,
        deleted_at: null,
      },
    },
  });

  if (userSession === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}