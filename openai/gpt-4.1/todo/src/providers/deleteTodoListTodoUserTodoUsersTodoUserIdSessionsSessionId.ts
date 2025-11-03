import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoListTodoUserTodoUsersTodoUserIdSessionsSessionId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Confirm todoUser can only operate on own user id
  if (props.todoUser.id !== props.todoUserId) {
    throw new HttpException(
      "Forbidden: Users can only delete their own sessions.",
      403,
    );
  }

  // Find the session to confirm existence and ownership
  const session = await MyGlobal.prisma.todo_list_todouser_sessions.findFirst({
    where: {
      id: props.sessionId,
      todo_list_todouser_id: props.todoUserId,
    },
  });
  if (!session) {
    throw new HttpException("Session not found.", 404);
  }

  await MyGlobal.prisma.todo_list_todouser_sessions.delete({
    where: { id: props.sessionId },
  });
  // No return needed for Promise<void>
}
