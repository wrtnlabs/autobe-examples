import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegisteredUserPayload } from "../../decorators/payload/RegisteredUserPayload";

export async function registeredUserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<RegisteredUserPayload> {
  const payload: RegisteredUserPayload = jwtAuthorize({ request }) as RegisteredUserPayload;

  if (payload.type !== "registeredUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const user = await MyGlobal.prisma.reddit_community_registered_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  const session = await MyGlobal.prisma.reddit_community_registered_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      reddit_community_registered_user_id: payload.id,
      expired_at: null
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired or invalid");
  }

  return payload;
}
