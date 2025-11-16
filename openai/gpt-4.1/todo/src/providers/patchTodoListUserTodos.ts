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
  const sortField = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const where = {
    todo_list_user_id: props.user.id,
    ...(props.body.is_completed !== undefined && {
      is_completed: props.body.is_completed,
    }),
    ...(props.body.title && {
      title: {
        contains: props.body.title,
        mode: "insensitive" as Prisma.QueryMode,
      },
    }),
    ...(props.body.created_from || props.body.created_to
      ? {
          created_at: {
            ...(props.body.created_from && { gte: props.body.created_from }),
            ...(props.body.created_to && { lte: props.body.created_to }),
          },
        }
      : {}),
    ...(props.body.updated_from || props.body.updated_to
      ? {
          updated_at: {
            ...(props.body.updated_from && { gte: props.body.updated_from }),
            ...(props.body.updated_to && { lte: props.body.updated_to }),
          },
        }
      : {}),
  };

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortField]: sortOrder },
      include: { user: true },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  const data = todos.map((todo) => ({
    id: todo.id,
    user: {
      id: todo.user.id,
      email: todo.user.email,
    },
    title: todo.title,
    is_completed: todo.is_completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
