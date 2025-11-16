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

  // payload.id contains the user ID (top-level user table ID)
  // payload.session_id contains the session ID
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: payload.session_id,
      user: {
        id: payload.id, // Main user table ID validation (no is_active field)
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("Session not found");
  }

  return payload;
}