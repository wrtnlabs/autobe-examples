import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticate and authorize Todo List user via JWT and database checks.
 */
export async function userAuthorize(request: {
  headers: { authorization?: string }
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // Validate active session
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id
    }
  });
  if (!session)
    throw new ForbiddenException("Invalid or expired session");

  // Validate the main user account is active
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
      locked: false
    }
  });
  if (!user)
    throw new ForbiddenException("User not found or access revoked");
  return payload;
}
