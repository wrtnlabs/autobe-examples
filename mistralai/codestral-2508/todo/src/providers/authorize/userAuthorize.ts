import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates and authorizes a Todo List user via JWT token using the loaded user/session schema.
 * Ensures the token role is 'user' and that a valid user exists in the DB for the provided id.
 * Throws if the user is not found or role is mismatched.
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

  // Check that the user exists and the session is valid. No soft-delete present.
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: { id: payload.id },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }
  return payload;
}
