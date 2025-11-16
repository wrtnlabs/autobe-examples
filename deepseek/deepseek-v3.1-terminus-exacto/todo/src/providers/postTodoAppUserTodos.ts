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

export async function postTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Verify user exists and is active
  const user = await MyGlobal.prisma.todo_app_users.findUnique({
    where: {
      id: props.user.id,
      deleted_at: null,
      status: "active",
    },
  });

  if (!user) {
    throw new HttpException("User not found or inactive", 404);
  }

  // Verify session exists and is valid
  const session = await MyGlobal.prisma.todo_app_user_sessions.findFirst({
    where: {
      id: props.user.session_id,
      todo_app_user_id: props.user.id,
      expired_at: null,
    },
  });

  if (!session) {
    throw new HttpException("Invalid or expired session", 401);
  }

  const now = toISOStringSafe(new Date());
  const todoId = v4();

  const created = await MyGlobal.prisma.todo_app_todos.create({
    data: {
      id: todoId,
      title: props.body.title,
      description: props.body.description ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      todo_app_user_id: props.user.id,
      todo_app_user_session_id: props.user.session_id,
      created_at: new Date(now),
      updated_at: new Date(now),
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

  return {
    id: todoId,
    title: created.title,
    description: created.description ?? undefined,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    user: {
      id: user.id,
      email: user.email,
      status: user.status,
      created_at: toISOStringSafe(user.created_at),
    },
    userSession: {
      id: session.id,
      ip: session.ip,
      href: session.href,
      referrer: session.referrer,
      created_at: toISOStringSafe(session.created_at),
      expired_at: session.expired_at
        ? toISOStringSafe(session.expired_at)
        : toISOStringSafe(new Date(0)), // Use epoch time for unexpired sessions
    },
  };
}
