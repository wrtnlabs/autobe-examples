import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a registered user of the Todo List application via JWT and verifies active status.
 *
 * @param request HTTP request containing bearer token in headers
 * @returns Authenticated user payload, if valid; throws otherwise
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

  // Authenticate that the user exists in the database by primary key
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: payload.id },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
