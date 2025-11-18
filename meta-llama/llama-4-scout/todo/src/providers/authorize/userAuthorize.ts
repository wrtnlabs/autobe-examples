import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Provider function to authorize user through JWT and active session/account validation.
 *
 * @param request Incoming HTTP request containing authorization header.
 * @returns Authenticated user payload if validation passes; otherwise throws error.
 */
export async function userAuthorize(request: {
  headers: { authorization?: string }
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // Validate session: must exist, refer to user, not expired
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id,
      expired_at: null,
    },
  });
  if (session === null)
    throw new ForbiddenException("Session is not valid or expired");

  // Validate user: must be verified, active, not deleted
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
      is_active: true,
      is_verified: true,
      deleted_at: null,
    },
  });
  if (user === null)
    throw new ForbiddenException("You're not enrolled, deactivated, deleted, or not verified");

  return payload;
}
