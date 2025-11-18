import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: { headers: { authorization?: string } }): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id is top-level user table ID
  // Verify session validity and that user owns the session
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todoListUser: {
        id: payload.id,
      },
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session expired");
  }

  return payload;
}
