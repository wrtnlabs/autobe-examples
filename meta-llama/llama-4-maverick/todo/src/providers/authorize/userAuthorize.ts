import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a user via JWT and validates session ownership and account existence.
 *
 * @param request HTTP headers, must contain Bearer JWT token
 * @returns UserPayload object for authenticated user
 * @throws ForbiddenException if authentication or session is invalid
 */
export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }
  // Validate active session belonging to the user
  const session = await MyGlobal.prisma.todo_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_user_id: payload.id,
      expired_at: null,
    },
  });
  if (session === null) {
    throw new ForbiddenException("You're not enrolled, or session expired.");
  }
  // Validate user existence
  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      id: payload.id,
    },
  });
  if (user === null) {
    throw new ForbiddenException("User does not exist");
  }
  return payload;
}