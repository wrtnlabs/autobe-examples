import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a user based on JWT token and active session validation.
 *
 * Verifies that the user exists and has a valid session, based on the UUID from JWT payload.
 * Throws ForbiddenException if verification fails.
 *
 * @param request The HTTP request object with headers
 * @returns Authenticated UserPayload
 */
export async function userAuthorize(request: {
  headers: { authorization?: string };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Check that the corresponding session belongs to the user and is active
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id,
      expired_at: null // Only active sessions
    },
  });
  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session is invalid");
  }
  // Double-check user existence
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { id: payload.id },
  });
  if (user === null) {
    throw new ForbiddenException("User does not exist");
  }
  // All checks pass – return validated payload
  return payload;
}
