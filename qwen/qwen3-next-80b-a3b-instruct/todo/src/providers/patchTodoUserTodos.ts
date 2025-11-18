import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const {
    page = 1,
    limit = 100,
    q,
    completed,
    created_from,
    created_to,
    completed_from,
    completed_to,
    sort_by = "created_at",
    sort_order = "desc",
  } = props.body;

  // Always scope to authenticated user, and only non-deleted user
  const where = {
    todo_user_id: props.user.id satisfies string as string,
    ...(completed !== undefined ? { completed } : {}),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from
              ? { gte: created_from satisfies string as string }
              : {}),
            ...(created_to
              ? { lte: created_to satisfies string as string }
              : {}),
          },
        }
      : {}),
    ...(completed_from || completed_to
      ? {
          completed_at: {
            ...(completed_from
              ? { gte: completed_from satisfies string as string }
              : {}),
            ...(completed_to
              ? { lte: completed_to satisfies string as string }
              : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            {
              title: {
                contains: q satisfies string as string,
                mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
              },
            },
            {
              description: {
                contains: q satisfies string as string,
                mode: "insensitive" satisfies Prisma.QueryMode as Prisma.QueryMode,
              },
            },
          ] as Prisma.todo_todosWhereInput[],
        }
      : {}),
  };

  const allowedSortFields = [
    "created_at",
    "updated_at",
    "completed_at",
    "title",
  ] as const;
  const orderByField = allowedSortFields.includes(
    sort_by as (typeof allowedSortFields)[number],
  )
    ? sort_by
    : "created_at";
  const orderBy = { [orderByField]: sort_order === "asc" ? "asc" : "desc" };

  const skip = Number(page) > 1 ? (Number(page) - 1) * Number(limit) : 0;
  const take = Number(limit) > 0 ? Math.min(Number(limit), 100) : 100;

  const user = await MyGlobal.prisma.todo_user.findFirst({
    where: { id: props.user.id satisfies string as string, deleted_at: null },
  });
  if (!user) {
    throw new HttpException("User not found or inactive", 404);
  }

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_todos.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.todo_todos.count({ where }),
  ]);

  const userSummary = {
    id: user.id satisfies string as string,
    email: user.email satisfies string as string,
    created_at: toISOStringSafe(user.created_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };

  const data = todos.map((todo) => ({
    id: todo.id satisfies string as string,
    title: todo.title satisfies string as string,
    completed: todo.completed,
    created_at: toISOStringSafe(todo.created_at),
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    user: userSummary,
  }));

  const pagination = {
    current: Number(page),
    limit: Number(limit),
    records: total,
    pages: Math.ceil(total / Number(limit)),
  };

  return { pagination, data };
}
