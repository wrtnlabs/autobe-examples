import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { IPageITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoListUserTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoListUserTodos(props: {
  user: UserPayload;
  body: ITodoListUserTodo.IRequest;
}): Promise<IPageITodoListUserTodo.ISummary> {
  // Set default values for pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where condition for user's todos excluding deleted ones
  const whereCondition = {
    todo_list_user_id: props.user.id,
    deleted_at: null,
  };

  // Execute findMany and count operations concurrently
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: whereCondition,
    }),
  ]);

  // Transform todos to match the ISummary interface
  const data = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  // Calculate pagination information
  const pagination: IPage.IPagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  };

  // Return the paginated response
  return {
    data,
    pagination,
  };
}
