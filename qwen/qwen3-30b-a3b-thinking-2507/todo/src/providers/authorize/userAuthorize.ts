import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { UserPayload } from "../../decorators/payload/UserPayload";

export async function userAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<UserPayload> {
  const payload: UserPayload = jwtAuthorize({ request }) as UserPayload;

  if (payload.type !== "user") {
    throw new ForbiddenException(`You're not a user`);
  }

  const user = await MyGlobal.prisma.todo_users.findFirst({
    where: {
      id: payload.id,
      deleted_at: null,
    },
  });

  if (!user) {
    throw new ForbiddenException("User not found");
  }

  return payload;
}