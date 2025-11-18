import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a Todo List user using JWT and verifies session/account validity.
 * - Validates that the session matches the account and is not expired.
 * - Ensures the account is not disabled.
 * Throws ForbiddenException if authentication fails at any stage.
 */
export async function userAuthorize(request: { headers: { authorization?: string } }): Promise<UserPayload> {
  const payload = jwtAuthorize({ request }) as UserPayload;
  if (payload.type !== "user")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // Check that session exists, is not expired, and refers to a valid user
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      expired_at: null,
      user: {
        id: payload.id,
        disabled_at: null,
      },
    },
  });

  if (!session) {
    throw new ForbiddenException("Invalid or expired session or inactive user.");
  }

  return payload;
}
