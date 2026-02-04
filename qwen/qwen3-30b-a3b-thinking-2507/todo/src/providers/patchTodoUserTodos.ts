import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IPageITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoUserTodos(props: {
  user: UserPayload;
  body: ITodoTodo.IRequest;
}): Promise<IPageITodoTodo.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const where: Prisma.todo_todosWhereInput = {
    user: { id: props.user.id },
    deleted_at: null,
  };
  let orderBy: Prisma.todo_todosOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Query database for paginated results
  const todos = await MyGlobal.prisma.todo_todos.findMany({
    where,
    skip,
    take: limit,
    orderBy,
  });
  // Count total records (without pagination)
  const total = await MyGlobal.prisma.todo_todos.count({ where });
  // Transform todos to summary format with correct date conversions and null handling
  const summaryTodos = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    is_complete: todo.completed,
    start_date: todo.start_date
      ? todo.start_date.toISOString().split("T")[0]
      : null,
    due_date: todo.due_date ? todo.due_date.toISOString().split("T")[0] : null,
    created_at: toISOStringSafe(todo.created_at),
  }));
  // Build pagination metadata
  return {
    data: summaryTodos,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
