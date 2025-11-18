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
  // Pagination: default page=1, limit=100, clamp to bounds
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Primary user filter, always enforced
  const baseWhere: Record<string, unknown> = {
    user_id: props.user.id,
  };
  // Add completed filter if present
  if (props.body.completed !== undefined) {
    baseWhere.completed = props.body.completed;
  }
  // Add search filter (case-insensitive, partial match on title)
  if (props.body.search !== undefined && props.body.search !== "") {
    baseWhere.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      // Optionally could include description as well if allowed: { description: { contains: props.body.search, mode: "insensitive" } }
    ];
  }
  // Sorting
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.order ?? "desc";
  // Valid sort fields: created_at, updated_at, completed_at
  const orderBy = { [sortBy]: sortOrder };

  // Query paginated records & count concurrently
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: baseWhere,
      orderBy: orderBy,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: baseWhere,
    }),
  ]);
  // Map to ISummary (summary: id, title, completed, created_at, updated_at only)
  const data: ITodoListTodo.ISummary[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    completed: row.completed,
    created_at: toISOStringSafe(row.created_at),
    updated_at: toISOStringSafe(row.updated_at),
  }));

  // IPage pagination shape
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
