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

  // Query user_session to verify active session and link to user
  const userSession = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id, // Correct field name from schema
    },
  });

  if (userSession === null) {
    throw new ForbiddenException("You're not enrolled or session is invalid");
  }

  return payload;
}