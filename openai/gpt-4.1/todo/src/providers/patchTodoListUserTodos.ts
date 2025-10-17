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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const { user, body } = props;
  const pageRaw = body.page ?? 1;
  const limitRaw = body.limit ?? 20;
  let page = pageRaw;
  let limit = limitRaw;
  // Enforce min/max for page/limit
  if (limit < 1) limit = 1;
  if (limit > 100) limit = 100;
  if (page < 1) page = 1;
  const skip = (page - 1) * limit;

  // Build where clause
  const where = {
    todo_list_user_id: user.id,
    ...(body.completed !== undefined && { completed: body.completed }),
    ...(body.search !== undefined &&
      body.search !== null &&
      body.search.length > 0 && {
        OR: [
          { title: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),
  };

  // Sorting
  const sortBy = body.sort_by ?? "created_at";
  const order: "asc" | "desc" = body.order ?? "desc";

  // Fetch todos and total count in parallel
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      orderBy: { [sortBy]: order },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where,
    }),
  ]);

  // Map to API DTO
  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description ?? undefined,
    completed: row.completed,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
    completed_at: row.completed_at
      ? toISOStringSafe(row.completed_at)
      : undefined,
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
