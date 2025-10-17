import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates and authorizes a registered user (todo_list_users).
 *
 * Verifies a valid JWT token, enforces the role type to be "user",
 * and confirms the user exists via the todo_list_users table
 * using the top-level user id. This function forms the core of
 * user-auth access control for todo management APIs.
 *
 * @param request Express request containing headers object
 * @returns The verified UserPayload if authorization is successful
 * @throws ForbiddenException if authorization fails
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

  // payload.id is always the primary key of todo_list_users (top-level user)
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
