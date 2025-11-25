import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { IPageITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const userId = props.user.id;
  const {
    query,
    status,
    created_from,
    created_to,
    completed_from,
    completed_to,
    sort_by = "created_at",
    sort_order = "desc",
    page = 1,
    page_size = 20,
  } = props.body;

  const where: Prisma.todo_list_todosWhereInput = {
    todo_list_user_id: userId,
    deleted_at: null,
    ...(status && { status }),
    ...(created_from && { created_at: { gte: created_from } }),
    ...(created_to && {
      created_at: {
        ...(created_from ? { gte: created_from } : {}),
        lte: created_to,
      },
    }),
    ...(created_from && !created_to && { created_at: { gte: created_from } }),
    ...(completed_from && { completed_at: { gte: completed_from } }),
    ...(completed_to && {
      completed_at: {
        ...(completed_from ? { gte: completed_from } : {}),
        lte: completed_to,
      },
    }),
    ...(completed_from &&
      !completed_to && { completed_at: { gte: completed_from } }),
    ...(query && query.length > 0
      ? {
          OR: [
            {
              title: {
                contains: query,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
            {
              description: {
                contains: query,
                mode: "insensitive" as Prisma.QueryMode,
              },
            },
          ] as Prisma.todo_list_todosWhereInput[],
        }
      : {}),
  };

  const take = page_size;
  const skip = (page - 1) * take;

  const allowedSortBy = [
    "created_at",
    "updated_at",
    "completed_at",
    "title",
  ] as const;
  const orderByField = allowedSortBy.includes(sort_by) ? sort_by : "created_at";
  const orderByDir = sort_order === "asc" ? "asc" : "desc";

  const [todos, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      orderBy: { [orderByField]: orderByDir },
      skip,
      take,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    },
    data: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: typia.assert<"pending" | "completed">(todo.status),
      completed_at: todo.completed_at
        ? toISOStringSafe(todo.completed_at)
        : null,
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      ...(todo.user && {
        user: {
          id: todo.user.id,
          email: todo.user.email,
          display_name: todo.user.display_name,
        },
      }),
    })),
  };
}
