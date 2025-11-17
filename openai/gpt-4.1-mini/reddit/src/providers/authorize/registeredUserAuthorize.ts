import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { RegistereduserPayload } from "../../decorators/payload/RegistereduserPayload";

export async function registereduserAuthorize(request: { headers: { authorization?: string } }): Promise<RegistereduserPayload> {
  const payload: RegistereduserPayload = jwtAuthorize({ request }) as RegistereduserPayload;

  if (payload.type !== "registereduser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const session = await MyGlobal.prisma.reddit_community_registereduser_sessions.findFirst({
    where: {
      id: payload.session_id,
      reddit_community_registereduser_id: payload.id,
      expired_at: null
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session expired");
  }

  const user = await MyGlobal.prisma.reddit_community_registeredusers.findFirst({
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
