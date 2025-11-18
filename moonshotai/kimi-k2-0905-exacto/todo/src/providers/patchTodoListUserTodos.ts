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
  const skip = (page - 1) * limit;

  // Build filters
  const filters: Record<string, unknown> = {
    todo_list_user_id: props.user.id,
    ...(props.body.completed !== undefined && {
      completed: props.body.completed,
    }),
    // Exclude soft-deleted unless explicitly requested
    ...(props.body.include_deleted ? {} : { deleted_at: null }),
    ...(props.body.search && {
      description: {
        contains: props.body.search,
      },
    }),
  };

  // Main query and total count in parallel
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: filters,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: filters,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: data.map((todo) => ({
      id: todo.id,
      description: todo.description,
      completed: todo.completed,
      // completed_at?: (string & tags.Format<'date-time'>) | null | undefined;
      completed_at: todo.completed_at
        ? toISOStringSafe(todo.completed_at)
        : undefined,
      created_at: toISOStringSafe(todo.created_at),
    })),
  };
}
