import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authorizes a user by verifying their JWT token and checking their existence in the database.
 *
 * @param request - The HTTP request object containing the authorization header.
 * @returns A promise that resolves to the user payload if authorization is successful.
 * @throws ForbiddenException if the user is not authorized or does not exist in the database.
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

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: payload.id,  // ← Use primary key if User is standalone
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}