import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodouserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodouserSession";
import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function getTodoListTodoUserTodoUsersTodoUserIdSessionsSessionId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
  sessionId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodouserSession> {
  const { todoUser, todoUserId, sessionId } = props;
  // Only allow access if the authenticated user matches todoUserId
  if (todoUser.id !== todoUserId) {
    throw new HttpException(
      "You are not authorized to access this user's sessions",
      403,
    );
  }
  const session = await MyGlobal.prisma.todo_list_todouser_sessions.findFirst({
    where: {
      id: sessionId,
      todo_list_todouser_id: todoUserId,
    },
  });
  if (!session) {
    throw new HttpException("Session not found", 404);
  }
  return {
    id: session.id,
    todo_list_todouser_id: session.todo_list_todouser_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at !== null && session.expired_at !== undefined
        ? toISOStringSafe(session.expired_at)
        : undefined,
  };
}
