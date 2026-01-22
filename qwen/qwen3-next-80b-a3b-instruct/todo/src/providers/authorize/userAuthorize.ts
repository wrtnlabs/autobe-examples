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

  // The todo_list_user_sessions schema shows foreign key field is 'user_id', not 'todo_list_user_id'
  const userSession = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: { gt: new Date() },
      user_id: payload.id, // Correct field name based on actual schema
    },
  });

  if (userSession === null) {
    throw new ForbiddenException("You're not enrolled or your session has expired");
  }

  return payload;
}