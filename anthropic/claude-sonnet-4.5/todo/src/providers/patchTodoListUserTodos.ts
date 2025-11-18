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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";
  const skip = (page - 1) * limit;

  const whereCondition = {
    todo_list_user_id: props.user.id,
    deleted_at: null,
    ...(props.body.search && {
      title: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status === "completed" && { completed: true }),
    ...(props.body.status === "incomplete" && { completed: false }),
  };

  const orderByMap = {
    created_at: { created_at: sortOrder },
    updated_at: { updated_at: sortOrder },
    completed: { completed: sortOrder },
  };

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereCondition,
      orderBy: orderByMap[sortBy],
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: whereCondition,
    }),
  ]);

  return {
    data: todos.map((todo) => ({
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      created_at: toISOStringSafe(todo.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
