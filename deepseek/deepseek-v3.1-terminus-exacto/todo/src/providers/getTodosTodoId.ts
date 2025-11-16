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

export async function getTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodo> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          status: true,
          created_at: true,
        },
      },
      userSession: {
        select: {
          id: true,
          ip: true,
          href: true,
          referrer: true,
          created_at: true,
          expired_at: true,
        },
      },
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  return {
    id: todo.id,
    title: todo.title,
    description: todo.description ?? undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
    user: todo.user
      ? {
          id: todo.user.id,
          email: todo.user.email,
          status: todo.user.status,
          created_at: toISOStringSafe(todo.user.created_at),
        }
      : undefined,
    userSession: todo.userSession
      ? {
          id: todo.userSession.id,
          ip: todo.userSession.ip,
          href: todo.userSession.href,
          referrer: todo.userSession.referrer,
          created_at: toISOStringSafe(todo.userSession.created_at),
          expired_at: todo.userSession.expired_at
            ? toISOStringSafe(todo.userSession.expired_at)
            : toISOStringSafe(new Date()), // Provide default value for required field
        }
      : undefined,
  };
}
