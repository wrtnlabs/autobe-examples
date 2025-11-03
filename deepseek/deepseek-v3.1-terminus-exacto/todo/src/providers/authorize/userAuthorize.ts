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
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // payload.id contains top-level user table ID
  // Query using appropriate field based on schema structure
  const user = await MyGlobal.prisma.todo_app_users.findFirst({
    where: {
      id: payload.id,  // ← Use primary key as todo_app_users is the top-level user table
      deleted_at: null,
      status: "active",
    },
  });

  if (user === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}