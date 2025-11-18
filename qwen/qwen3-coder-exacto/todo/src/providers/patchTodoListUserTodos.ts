import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
    search,
    completed,
    created_from,
    created_to,
    updated_from,
    updated_to,
    page,
    limit,
    sort_by,
    sort_order,
  } = props.body;

  const pageNumber = page ?? 1;
  const pageLimit = limit ?? 100;
  const skip = (pageNumber - 1) * pageLimit;

  // Build where clause with all filters
  const where: Record<string, unknown> = {
    user_id: userId,
    ...(typeof completed === "boolean" ? { completed } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(created_from || created_to
      ? {
          created_at: {
            ...(created_from ? { gte: created_from } : {}),
            ...(created_to ? { lte: created_to } : {}),
          },
        }
      : {}),
    ...(updated_from || updated_to
      ? {
          updated_at: {
            ...(updated_from ? { gte: updated_from } : {}),
            ...(updated_to ? { lte: updated_to } : {}),
          },
        }
      : {}),
  };

  // Determine sort column; only allow certain columns for security
  const sortKey =
    sort_by === "created_at" || sort_by === "updated_at" || sort_by === "title"
      ? sort_by
      : "created_at";
  const sortOrder =
    sort_order === "asc" || sort_order === "desc" ? sort_order : "desc";

  // Query total and data
  const [total, rows] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.count({ where }),
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: pageLimit,
      orderBy: { [sortKey]: sortOrder },
      include: {
        user: true,
      },
    }),
  ]);

  return {
    pagination: {
      current: pageNumber,
      limit: pageLimit,
      records: total,
      pages: Math.ceil(total / pageLimit),
    },
    data: rows.map((row) => ({
      id: row.id,
      title: row.title,
      completed: row.completed,
      created_at: toISOStringSafe(row.created_at),
      user: {
        id: row.user.id,
      },
    })),
  };
}
