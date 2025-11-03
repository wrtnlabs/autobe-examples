import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TodouserPayload } from "../../decorators/payload/TodouserPayload";

/**
 * Provider function to authenticate and authorize a todouser via JWT.
 * - Ensures payload.type is "todoUser"
 * - Verifies session and user existence
 * - Returns TodouserPayload if authorized
 */
export async function todouserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TodouserPayload> {
  const payload: TodouserPayload = jwtAuthorize({ request }) as TodouserPayload;

  if (payload.type !== "todoUser") {
    throw new ForbiddenException(`You're not ${payload.type}`);
  }

  // Verify session exists and is valid for todouser and session_id
  const session = await MyGlobal.prisma.todo_list_todouser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_list_todouser_id: payload.id,
      expired_at: null,
      todoListTodouser: {}, // Ensures user exists via relation
    },
  });

  if (session === null) {
    throw new ForbiddenException("You're not enrolled or session is invalid");
  }

  return payload;
}
