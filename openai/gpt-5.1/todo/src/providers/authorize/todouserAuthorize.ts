import { ForbiddenException } from "@nestjs/common";

import { MyGlobal } from "../../MyGlobal";
import { jwtAuthorize } from "./jwtAuthorize";
import { TodouserPayload } from "../../decorators/payload/TodouserPayload";

/**
 * Authorize an authenticated todouser based on JWT payload and session validity.
 *
 * - Verifies the JWT using the shared jwtAuthorize helper
 * - Ensures the payload.type is exactly "todouser"
 * - Confirms there is a valid, non-expired session for the user
 * - Confirms the underlying todo user account is active (status === "active")
 */
export async function todouserAuthorize(request: {
  headers: {
    authorization?: string;
  };
}): Promise<TodouserPayload> {
  const payload: TodouserPayload = jwtAuthorize({ request }) as TodouserPayload;

  if (payload.type !== "todouser") {
    throw new ForbiddenException("You're not todouser");
  }

  // Validate that the session exists and is associated with the given user.
  const session = await MyGlobal.prisma.todo_app_todouser_sessions.findFirst({
    where: {
      id: payload.session_id,
      todo_app_todouser_id: payload.id,
      expired_at: null,
    },
  });

  if (session === null) {
    throw new ForbiddenException("Invalid or expired session");
  }

  // Validate that the underlying todo user account is active.
  const todoUser = await MyGlobal.prisma.todo_app_todousers.findFirst({
    where: {
      id: payload.id,
      status: "active",
    },
  });

  if (todoUser === null) {
    throw new ForbiddenException("You're not enrolled or inactive");
  }

  return payload;
}
