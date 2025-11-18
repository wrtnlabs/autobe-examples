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
  const { user, body } = props;

  // Pagination defaults and constraints
  const page = body.page >= 1 ? body.page : 1;
  const limit = body.limit >= 1 && body.limit <= 50 ? body.limit : 20;
  const skip = (page - 1) * limit;

  // Build dynamic where clause for filters
  const where: Record<string, any> = {
    user_id: user.id,
  };
  if (typeof body.completed === "boolean") {
    where.completed = body.completed;
  }
  if (body.due_date_from ?? false) {
    where.due_date = where.due_date ?? {};
    where.due_date.gte = body.due_date_from;
  }
  if (body.due_date_to ?? false) {
    where.due_date = where.due_date ?? {};
    where.due_date.lte = body.due_date_to;
  }

  // Sorting: defaults from DTO
  let orderBy: any = {};
  if (body.sort_by === "due_date") {
    orderBy = { due_date: body.sort_order };
  } else if (body.sort_by === "completed") {
    orderBy = { completed: body.sort_order };
  } else {
    // Default/fallback: created_at
    orderBy = { created_at: body.sort_order };
  }

  // Fetch data and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: true,
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  // Map DB results to ISummary DTO
  const data = rows.map((row) => ({
    id: row.id,
    user: { id: row.user_id },
    description: row.description,
    due_date: row.due_date !== null ? toISOStringSafe(row.due_date) : undefined,
    completed: row.completed,
    completed_at:
      row.completed_at !== null ? toISOStringSafe(row.completed_at) : undefined,
  }));

  // Pagination info
  const pagination = {
    current: page,
    limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return {
    pagination,
    data,
  };
}
