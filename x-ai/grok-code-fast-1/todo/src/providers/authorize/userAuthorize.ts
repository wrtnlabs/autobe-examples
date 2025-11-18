import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Ensure that user exists, is not soft-deleted, and session is valid
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    },
  });
  if (!user) {
    throw new ForbiddenException("You're not enrolled or have been deactivated.");
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id,
      expired_at: null
    },
  });
  if (!session) {
    throw new ForbiddenException("Session is invalid or expired.");
  }

  return payload;
}
