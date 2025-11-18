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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const where = {
    user_id: props.user.id,
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.search && {
      OR: [
        { title: { contains: props.body.search } },
        { description: { contains: props.body.search } },
      ],
    }),
    ...(props.body.due_date_from || props.body.due_date_to
      ? {
          due_date: {
            ...(props.body.due_date_from && { gte: props.body.due_date_from }),
            ...(props.body.due_date_to && { lte: props.body.due_date_to }),
          },
        }
      : {}),
  };

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: { user: true },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  const data = todos.map((todo) => ({
    id: todo.id,
    user: {
      id: todo.user.id,
      email: todo.user.email,
      created_at: toISOStringSafe(todo.user.created_at),
      updated_at: toISOStringSafe(todo.user.updated_at),
      disabled_at: todo.user.disabled_at
        ? toISOStringSafe(todo.user.disabled_at)
        : null,
    },
    title: todo.title,
    description: Object.prototype.hasOwnProperty.call(todo, "description")
      ? (todo.description ?? null)
      : undefined,
    status: typia.assert<"pending" | "completed" | "deleted">(todo.status),
    due_date: Object.prototype.hasOwnProperty.call(todo, "due_date")
      ? todo.due_date
        ? toISOStringSafe(todo.due_date)
        : null
      : undefined,
    completed_at: Object.prototype.hasOwnProperty.call(todo, "completed_at")
      ? todo.completed_at
        ? toISOStringSafe(todo.completed_at)
        : null
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: Object.prototype.hasOwnProperty.call(todo, "deleted_at")
      ? todo.deleted_at
        ? toISOStringSafe(todo.deleted_at)
        : null
      : undefined,
  }));

  const pagination = {
    current: page satisfies number as number,
    limit: limit satisfies number as number,
    records: total,
    pages: Math.ceil(total / limit),
  };

  return { pagination, data };
}
