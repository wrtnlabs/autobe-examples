import { ForbiddenException } from "@nestjs/common";

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

  // Query user session to verify authentication
  const session = await MyGlobal.prisma.todo_app_user_session.findFirst({
    where: {
      id: payload.session_id,
      user_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session is invalid or expired");
  }

  // Verify user account is active
  const user = await MyGlobal.prisma.todo_app_user.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new ForbiddenException("User account is not available");
  }

  return payload;
}