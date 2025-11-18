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
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions with proper typing
  const whereConditions: Record<string, unknown> = {
    todo_list_user_id: props.user.id, // Always filter by authenticated user
    deleted_at: null,
  };

  // Add search filter if provided
  if (props.body.search) {
    whereConditions.OR = [
      { title: { contains: props.body.search, mode: "insensitive" } },
      { description: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add status filter if provided
  if (props.body.status) {
    whereConditions.status = props.body.status;
  }

  // Additional user_id filter (must match authenticated user for security)
  if (props.body.user_id && props.body.user_id !== props.user.id) {
    throw new HttpException("You can only search your own todos", 403);
  }

  // Build orderBy configuration
  const orderBy: Record<string, "asc" | "desc"> = {};
  const orderField = props.body.order_by || "created_at";
  const orderDirection = props.body.order_direction || "desc";
  orderBy[orderField] = orderDirection;

  try {
    // Execute queries concurrently for performance
    const [data, total] = await Promise.all([
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

    // Convert database results to API response format
    const todos = data.map((todo) => ({
      id: todo.id,
      title: todo.title,
      description: todo.description ?? undefined,
      status: typia.assert<"pending" | "completed">(todo.status),
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      deleted_at: todo.deleted_at
        ? toISOStringSafe(todo.deleted_at)
        : undefined,
    }));

    return {
      data: todos,
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve todos", 500);
  }
}
