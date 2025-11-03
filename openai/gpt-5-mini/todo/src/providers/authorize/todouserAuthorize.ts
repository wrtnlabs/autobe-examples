// File: src/providers/authorize/todouserAuthorize.ts
import { ForbiddenException } from "@nestjs/common";
import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TodouserPayload } from "../../decorators/payload/TodouserPayload";

/**
 * Validate JWT, ensure role is 'todouser', and confirm the session and
 * top-level user are active according to the Prisma schema.
 */
export async function todouserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TodouserPayload> {
  const payload = jwtAuthorize({ request }) as TodouserPayload;

  if (payload.type !== "todouser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify that the session exists, belongs to the todo_app_todouser, and
  // that the top-level user is active (deleted_at null and status 'active').
  const session = await MyGlobal.prisma.todo_app_todouser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todouser: {
        id: payload.id,
        deleted_at: null,
        status: "active",
      },
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled");
  }

  return payload;
}
