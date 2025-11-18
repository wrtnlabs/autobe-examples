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

  // Verify user exists and is active
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Verify session is valid
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session expired");
  }

  return payload;
}