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
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;

  // Build dynamic where conditions
  const whereConditions: Record<string, unknown> = {
    user_id: props.user.id,
    deleted_at: null,
  };

  // Add completion status filter if specified
  if (props.body.completed !== undefined && props.body.completed !== null) {
    whereConditions.completed = props.body.completed;
  }

  // Add priority filter if specified
  if (props.body.priority !== undefined && props.body.priority !== null) {
    whereConditions.priority = props.body.priority;
  }

  // Add full-text search if provided
  if (props.body.search !== undefined && props.body.search !== null) {
    whereConditions.OR = [
      {
        title: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
      {
        description: {
          contains: props.body.search,
          mode: "insensitive",
        },
      },
    ];
  }

  // Determine sort field and order
  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.order ?? "desc";

  const orderBy: Record<string, "asc" | "desc"> = {
    [sortBy]: sortOrder,
  };

  // Execute concurrent queries for efficiency
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_list_todos.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_list_todos.count({
      where: whereConditions,
    }),
  ]);

  // Transform todos to ISummary format with proper date conversion
  const data: ITodoListTodo.ISummary[] = todos.map((todo) => ({
    id: todo.id as string & tags.Format<"uuid">,
    title: todo.title,
    completed: todo.completed,
    priority:
      todo.priority === null
        ? undefined
        : (todo.priority as "low" | "medium" | "high"),
    due_date:
      todo.due_date === null
        ? undefined
        : (toISOStringSafe(todo.due_date) as string & tags.Format<"date-time">),
    created_at: toISOStringSafe(todo.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(todo.updated_at) as string &
      tags.Format<"date-time">,
  }));

  // Calculate total pages
  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: page satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      limit: limit satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      records: total satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pages: pages satisfies number as number as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data,
  };
}
