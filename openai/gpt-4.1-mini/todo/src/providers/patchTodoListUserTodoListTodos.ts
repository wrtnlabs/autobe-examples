import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function patchTodoListUserTodoListTodos(props: {
  user: UserPayload;
  body: ITodoListTodo.IRequest;
}): Promise<IPageITodoListTodo.ISummary> {
  const page = props.body.page > 0 ? Math.floor(props.body.page) : 1;
  const limit = props.body.limit > 0 ? Math.floor(props.body.limit) : 100;
  const skip = (page - 1) * limit;

  const where = {
    todo_list_user_id: props.user.id,
    deleted_at: null as null,
    ...(props.body.is_complete !== undefined && props.body.is_complete !== null
      ? { is_complete: props.body.is_complete }
      : {}),
    ...(props.body.search
      ? {
          OR: [
            {
              title: {
                contains: props.body.search,
                mode: "insensitive",
              } satisfies { contains: string; mode: "insensitive" } as {
                contains: string;
                mode: "insensitive";
              },
            },
            {
              description: {
                contains: props.body.search,
                mode: "insensitive",
              } satisfies { contains: string; mode: "insensitive" } as {
                contains: string;
                mode: "insensitive";
              },
            },
          ],
        }
      : {}),
  };

  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_todos.count({ where }),
  ]);

  const data = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    is_complete: todo.is_complete,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

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
