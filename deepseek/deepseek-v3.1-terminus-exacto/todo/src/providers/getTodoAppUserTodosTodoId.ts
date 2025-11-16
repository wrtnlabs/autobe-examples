import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Fetch user and session data separately since relations aren't working
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: { id: todo.todo_app_user_id },
    select: {
      id: true,
      email: true,
      status: true,
      created_at: true,
    },
  });

  const userSession = await MyGlobal.prisma.todo_app_user_sessions.findUnique({
    where: { id: todo.todo_app_user_session_id },
    select: {
      id: true,
      ip: true,
      href: true,
      referrer: true,
      created_at: true,
      expired_at: true,
    },
  });

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
    user: user
      ? {
          id: user.id,
          email: user.email,
          status: user.status,
          created_at: toISOStringSafe(user.created_at),
        }
      : undefined,
    userSession: userSession
      ? {
          id: userSession.id,
          ip: userSession.ip,
          href: userSession.href,
          referrer: userSession.referrer,
          created_at: toISOStringSafe(userSession.created_at),
          expired_at: userSession.expired_at
            ? toISOStringSafe(userSession.expired_at)
            : toISOStringSafe(new Date(0)), // Use epoch start for null values
        }
      : undefined,
  };
}
