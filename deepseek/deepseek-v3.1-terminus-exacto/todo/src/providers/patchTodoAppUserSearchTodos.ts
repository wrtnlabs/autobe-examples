import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserSearchTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const DEFAULT_PAGE = 1;
  const DEFAULT_LIMIT = 100;

  const page = props.body.page ?? DEFAULT_PAGE;
  const limit = props.body.limit ?? DEFAULT_LIMIT;
  const skip = (page - 1) * limit;

  // Build search conditions safely
  const searchCondition =
    props.body.search && props.body.search.trim()
      ? {
          OR: [
            {
              title: {
                contains: props.body.search.trim(),
                mode: "insensitive" as const,
              },
            },
            {
              description: {
                contains: props.body.search.trim(),
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {};

  // Build date range conditions
  const dateCondition: Record<string, unknown> = {};

  if (props.body.due_before || props.body.due_after) {
    dateCondition.due_date = {};
    if (props.body.due_before) {
      (dateCondition.due_date as Record<string, unknown>).lte =
        props.body.due_before;
    }
    if (props.body.due_after) {
      (dateCondition.due_date as Record<string, unknown>).gte =
        props.body.due_after;
    }
  }

  const whereCondition = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
    ...searchCondition,
    ...dateCondition,
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
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
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total > 0 ? Math.ceil(total / limit) : 0,
    },
    data: data.map((todo) => ({
      id: todo.id,
      user: {
        id: todo.user.id,
        email: todo.user.email,
        status: todo.user.status,
        created_at: toISOStringSafe(todo.user.created_at),
      },
      session: todo.userSession
        ? {
            id: todo.userSession.id,
            ip: todo.userSession.ip,
            href: todo.userSession.href,
            referrer: todo.userSession.referrer,
            created_at: toISOStringSafe(todo.userSession.created_at),
            expired_at: todo.userSession.expired_at
              ? toISOStringSafe(todo.userSession.expired_at)
              : toISOStringSafe(new Date(0)), // Provide default date instead of undefined
          }
        : undefined,
      title: todo.title,
      description: todo.description === null ? undefined : todo.description,
      due_date:
        todo.due_date === null ? undefined : toISOStringSafe(todo.due_date),
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      deleted_at:
        todo.deleted_at === null ? undefined : toISOStringSafe(todo.deleted_at),
    })),
  };
}
