import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserTodoListUsersTodoListUserIdTodoListUserSessionsId(props: {
  user: UserPayload;
  todoListUserId: string & tags.Format<"uuid">;
  id: string & tags.Format<"uuid">;
}): Promise<ITodoListUserSession> {
  if (props.user.id !== props.todoListUserId) {
    throw new HttpException("Forbidden", 403);
  }

  const session = await MyGlobal.prisma.todo_list_user_sessions.findUnique({
    where: {
      id: props.id,
    },
  });

  if (session === null || session.todo_list_user_id !== props.todoListUserId) {
    throw new HttpException("Session not found", 404);
  }

  return {
    id: session.id,
    todo_list_user_id: session.todo_list_user_id,
    ip: session.ip,
    href: session.href,
    referrer: session.referrer,
    created_at: toISOStringSafe(session.created_at),
    expired_at:
      session.expired_at === null ? null : toISOStringSafe(session.expired_at),
  };
}
