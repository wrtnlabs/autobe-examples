import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: {
  headers: { authorization?: string };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // Session validation: Ensure this session exists for the right user and is not expired
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_user_id: payload.id,
      expired_at: null
    },
  });
  if (!session) {
    throw new ForbiddenException("You're not enrolled or session is invalid");
  }
  // User existence validation: Must exist and be a valid account
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: { id: payload.id },
  });
  if (!user) {
    throw new ForbiddenException("User does not exist");
  }
  return payload;
}
