import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  // Build where condition based on filter criteria
  const where: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    is_deleted: props.body.isDeleted ?? false,
  };
  // Apply status filter if specified
  if (props.body.status === "complete") {
    where.is_complete = true;
  } else if (props.body.status === "incomplete") {
    where.is_complete = false;
  }
  // Build order by clause based on sort fields with proper NULL handling
  const orderBy: Prisma.todo_app_todosOrderByWithRelationInput[] = [];
  if (props.body.sortFields && props.body.sortFields.length > 0) {
    for (const sortField of props.body.sortFields) {
      const direction = sortField.direction === "asc" ? "asc" : "desc";
      // For date fields, NULL values should appear at the end regardless of sort direction
      if (sortField.field === "created_at") {
        orderBy.push({ created_at: direction });
      } else if (sortField.field === "start_date") {
        orderBy.push({ start_date: direction });
      } else if (sortField.field === "due_date") {
        orderBy.push({ due_date: direction });
      }
    }
  }
  // Default sort if no sort fields specified
  if (orderBy.length === 0) {
    orderBy.push({ created_at: "desc" });
  }
  // Query todos with pagination
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        title: true,
        is_complete: true,
        start_date: true,
        due_date: true,
        created_at: true,
        user: {
          select: {
            id: true,
            email: true,
            created_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({ where }),
  ]);
  // Transform to ISummary format with proper type handling
  const data: ITodoAppTodo.ISummary[] = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    is_complete: todo.is_complete,
    start_date: todo.start_date ? toISOStringSafe(todo.start_date) : null,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : null,
    created_at: toISOStringSafe(todo.created_at),
    author: {
      id: todo.user.id,
      email: todo.user.email,
      created_at: toISOStringSafe(todo.user.created_at),
    },
  }));
  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
  };
}
