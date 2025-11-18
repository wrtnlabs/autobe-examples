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

  // Verify user exists and is active
  const userSession = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_user_id: payload.id,
      expired_at: null,
      user: {
        deleted_at: null,
        status: {
          in: ["active", "verified"]
        }
      }
    }
  });

  if (userSession === null) {
    throw new ForbiddenException("Invalid session or user not found");
  }

  return payload;
}