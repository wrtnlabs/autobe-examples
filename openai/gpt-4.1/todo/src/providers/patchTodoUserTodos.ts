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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const userId = props.user.id;
  const body = props.body;

  // Pagination
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition
  const where: Record<string, any> = { user_id: userId };

  if (body.search) {
    where.description = { contains: body.search };
  }
  if (body.is_completed !== undefined) {
    where.is_completed = body.is_completed;
  }
  if (body.created_from || body.created_to) {
    where.created_at = {};
    if (body.created_from) where.created_at.gte = body.created_from;
    if (body.created_to) where.created_at.lte = body.created_to;
  }
  if (body.updated_from || body.updated_to) {
    where.updated_at = {};
    if (body.updated_from) where.updated_at.gte = body.updated_from;
    if (body.updated_to) where.updated_at.lte = body.updated_to;
  }

  // Order
  let orderBy: Record<string, "asc" | "desc"> = { updated_at: "desc" };
  if (body.order_by) {
    orderBy = { [body.order_by]: body.order_desc ? "desc" : "asc" };
  } else if (body.order_desc === false) {
    orderBy = { updated_at: "asc" };
  }

  // Query todos and total count
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_todos.count({
      where,
    }),
  ]);

  // Map DB results to ISummary
  const data = todos.map((todo) => ({
    id: todo.id,
    user_id: todo.user_id,
    description: todo.description,
    is_completed: todo.is_completed,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
