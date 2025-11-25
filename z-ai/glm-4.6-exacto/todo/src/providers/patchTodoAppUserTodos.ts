import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
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
    sort_by,
    sort_order,
    page = 1,
    page_size = 20,
    // owner_user_id is ignored for normal users (cannot override their own id)
  } = props.body;

  // Calculate pagination
  const pageNumber = page ?? 1;
  const limit = page_size ?? 20;
  const skip = (pageNumber - 1) * limit;

  // Only allow sort_by on whitelisted fields
  const sortable: Record<string, true> = {
    title: true,
    created_at: true,
    updated_at: true,
    due_date: true,
    status: true,
  };
  const resolvedSortBy = sort_by && sortable[sort_by] ? sort_by : "created_at";
  const resolvedSortOrder = sort_order === "asc" ? "asc" : "desc";

  // Build search conditions
  const where: Record<string, unknown> = {
    todo_app_user_id: props.user.id,
    ...(status && { status }),
    ...(title && {
      title: {
        contains: title,
        mode: "insensitive",
      },
    }),
    ...(description && {
      description: {
        contains: description,
        mode: "insensitive",
      },
    }),
    ...(due_date_from || due_date_to
      ? {
          due_date: {
            ...(due_date_from && { gte: due_date_from }),
            ...(due_date_to && { lte: due_date_to }),
          },
        }
      : {}),
    ...(created_at_from || created_at_to
      ? {
          created_at: {
            ...(created_at_from && { gte: created_at_from }),
            ...(created_at_to && { lte: created_at_to }),
          },
        }
      : {}),
  };

  // Query database (findMany handles skip/take/orderBy, then count)
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [resolvedSortBy]: resolvedSortOrder },
      select: {
        id: true,
        title: true,
        status: true,
        due_date: true,
        completed_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({ where }),
  ]);

  // Map DB records to ISummary DTO
  const data: ITodoAppTodo.ISummary[] = todos.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    due_date: row.due_date == null ? null : toISOStringSafe(row.due_date),
    completed_at:
      row.completed_at == null ? null : toISOStringSafe(row.completed_at),
    deleted_at: row.deleted_at == null ? null : toISOStringSafe(row.deleted_at),
  }));

  return {
    pagination: {
      current: Number(pageNumber),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
