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

  // Extract and apply defaults, stripping branded types
  const page = Number(body.page ?? 1);
  const limit = Number(body.limit ?? 50);
  const sort = body.sort ?? "created_at";
  const order = body.order ?? "desc";

  // Validate sort field
  const allowedSortFields = ["created_at", "updated_at", "title"];
  const sortField = allowedSortFields.includes(sort) ? sort : "created_at";
  const sortOrder = order === "asc" ? "asc" : "desc";

  // Calculate skip for pagination
  const skip = (page - 1) * limit;

  // Execute queries concurrently with inline parameters
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: {
        todo_list_user_id: user.id,
        deleted_at: null,
        ...(body.completed !== undefined && { completed: body.completed }),
        ...(body.search &&
          body.search.length > 0 && {
            OR: [
              { title: { contains: body.search } },
              { description: { contains: body.search } },
            ],
          }),
      },
      select: {
        id: true,
        title: true,
        completed: true,
        created_at: true,
      },
      orderBy: { [sortField]: sortOrder },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: {
        todo_list_user_id: user.id,
        deleted_at: null,
        ...(body.completed !== undefined && { completed: body.completed }),
        ...(body.search &&
          body.search.length > 0 && {
            OR: [
              { title: { contains: body.search } },
              { description: { contains: body.search } },
            ],
          }),
      },
    }),
  ]);

  // Calculate total pages
  const totalPages = Math.ceil(total / limit);

  // Transform results to ISummary format with proper date conversion
  const data = rows.map((row) => ({
    id: row.id,
    title: row.title,
    completed: row.completed,
    created_at: toISOStringSafe(row.created_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    },
    data,
  };
}
