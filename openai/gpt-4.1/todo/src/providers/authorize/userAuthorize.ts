import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticate and authorize a registered todo_list user via JWT and DB verification.
 *
 * @param request Express-style HTTP request headers containing the bearer token.
 * @returns Payload info after validating user session and identity.
 * @throws ForbiddenException if user JWT or session is invalid.
 */
export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  // Validate JWT. Throws exception if invalid.
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // Validate session and user existence with cascading ownership check.
  const session = await MyGlobal.prisma.todo_list_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_user_id: payload.id,
      expired_at: null,
      user: {
        // Confirm user exists
        id: payload.id,
      },
    },
  });
  if (!session) throw new ForbiddenException("You're not enrolled");
  return payload;
}
