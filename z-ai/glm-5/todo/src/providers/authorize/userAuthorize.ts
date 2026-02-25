import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: {
  headers: { authorization?: string };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  // Check if account is locked
  if (user.locked_until !== null && user.locked_until > new Date()) {
    throw new ForbiddenException("Account is temporarily locked");
  }

  return payload;
}