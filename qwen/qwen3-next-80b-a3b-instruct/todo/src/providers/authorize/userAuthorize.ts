import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * JWT-based authentication provider for regular users.
 *
 * Verifies JWT, checks payload for correct user role, and ensures referenced user is active & not soft-deleted.
 * Returns the JWT payload if authentication and validation succeed.
 * Throws ForbiddenException if access is invalid.
 */
export async function userAuthorize(request: {
  headers: { authorization?: string }
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user")
    throw new ForbiddenException(`You're not ${payload.type}`);

  // The JWT payload.id is always the top-level user primary key
  const user = await MyGlobal.prisma.todo_user.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    }
  });

  if (!user)
    throw new ForbiddenException("You're not enrolled");

  return payload;
}
