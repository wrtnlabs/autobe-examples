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

export async function postTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.ICreate;
}): Promise<ITodoAppTodo> {
  // Create the todo item - session validation already handled by authorization
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

  // Convert to API response format with proper null/undefined handling
  return {
    id: created.id as string & tags.Format<"uuid">,
    title: created.title,
    description: created.description ?? undefined,
    due_date: created.due_date ? toISOStringSafe(created.due_date) : undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    user: created.user
      ? {
          id: created.user.id as string & tags.Format<"uuid">,
          email: created.user.email as string & tags.Format<"email">,
          status: created.user.status,
          created_at: toISOStringSafe(created.user.created_at),
        }
      : undefined,
    userSession: created.userSession
      ? {
          id: created.userSession.id as string & tags.Format<"uuid">,
          ip: created.userSession.ip,
          href: created.userSession.href,
          referrer: created.userSession.referrer,
          created_at: toISOStringSafe(created.userSession.created_at),
          expired_at: toISOStringSafe(
            created.userSession.expired_at ?? new Date(),
          ),
        }
      : undefined,
  };
}
