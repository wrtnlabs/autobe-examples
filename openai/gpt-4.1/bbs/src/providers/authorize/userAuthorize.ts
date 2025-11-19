import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

/**
 * Authenticates a standard discussion board user via JWT and checks DB validity.
 * Throws if the token is invalid, role is incorrect, soft-deleted, or missing.
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
  // Confirm user exists, is not deleted
  const user = await MyGlobal.prisma.discussion_board_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null
    }
  });
  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }
  return payload;
}
