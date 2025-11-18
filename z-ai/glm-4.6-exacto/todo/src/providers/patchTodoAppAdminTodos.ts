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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminTodos(props: {
  admin: AdminPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const {
    title,
    description,
    status,
    due_date_from,
    due_date_to,
    created_at_from,
    created_at_to,
    owner_user_id,
    sort_by,
    sort_order,
    page = 1,
    page_size = 20,
  } = props.body || {};

  const take = Math.min(page_size ?? 20, 200);
  const skip = ((page ?? 1) - 1) * take;

  // Build where condition
  const where = {
    ...(title
      ? {
          title: {
            contains: title satisfies string as string,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {}),
    ...(description
      ? {
          description: {
            contains: description satisfies string as string,
            mode: "insensitive" as Prisma.QueryMode,
          },
        }
      : {}),
    ...(status ? { status } : {}),
    ...(due_date_from || due_date_to
      ? {
          due_date: {
            ...(due_date_from ? { gte: due_date_from } : {}),
            ...(due_date_to ? { lte: due_date_to } : {}),
          },
        }
      : {}),
    ...(created_at_from || created_at_to
      ? {
          created_at: {
            ...(created_at_from ? { gte: created_at_from } : {}),
            ...(created_at_to ? { lte: created_at_to } : {}),
          },
        }
      : {}),
    ...(owner_user_id ? { owner_user_id } : {}),
    deleted_at: null,
  };

  // Supported sort fields
  const sortableFields = [
    "title",
    "created_at",
    "updated_at",
    "due_date",
    "status",
  ];
  const orderByField = sortableFields.includes(sort_by ?? "")
    ? (sort_by as string)
    : "created_at";
  const orderByOrder = sort_order === "asc" ? "asc" : "desc";
  const orderBy: Record<string, "asc" | "desc"> = {
    [orderByField]: orderByOrder,
  };

  // Query todos and count in parallel
  const [todos, records] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_todos.count({ where }),
  ]);

  return {
    pagination: {
      current: page,
      limit: take,
      records,
      pages: Math.ceil(records / take),
    },
    data: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      status: todo.status,
      due_date: todo.due_date ? toISOStringSafe(todo.due_date) : null,
      completed_at:
        typeof todo.completed_at === "undefined" || todo.completed_at === null
          ? null
          : toISOStringSafe(todo.completed_at),
      deleted_at:
        typeof todo.deleted_at === "undefined" || todo.deleted_at === null
          ? null
          : toISOStringSafe(todo.deleted_at),
    })),
  };
}
