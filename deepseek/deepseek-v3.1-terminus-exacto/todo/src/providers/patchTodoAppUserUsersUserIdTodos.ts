import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppTodoStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoStatus";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUsersUserIdTodos(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const { user, userId, body } = props;

  // Authorization check: user can only access their own todos
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only access your own todo items",
      403,
    );
  }

  // Set pagination defaults with proper bounds
  const page = Math.max(1, body.page ?? 1);
  const limit = Math.min(100, Math.max(1, body.limit ?? 20));
  const skip = (page - 1) * limit;

  // Build WHERE conditions with proper undefined handling
  const whereConditions = {
    todo_app_user_id: userId,
    deleted_at: null, // Active todos only
    ...(body.status !== undefined && { status: body.status }),
    ...(body.search !== undefined && {
      title: { contains: body.search },
    }),
    ...((body.created_at_start !== undefined ||
      body.created_at_end !== undefined) && {
      created_at: {
        ...(body.created_at_start !== undefined && {
          gte: body.created_at_start,
        }),
        ...(body.created_at_end !== undefined && { lte: body.created_at_end }),
      },
    }),
  };

  // Determine order by and direction with defaults
  const orderByField = body.order_by ?? "created_at";
  const orderDirection = body.order_direction ?? "desc";

  // Execute concurrent queries for performance
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereConditions,
      orderBy: { [orderByField]: orderDirection },
      skip: skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereConditions,
    }),
  ]);

  // Transform results to match API interface with proper date conversions
  const data = todos.map((todo) => ({
    id: todo.id,
    user: {
      id: todo.user.id,
      email: todo.user.email,
      status: todo.user.status,
      created_at: toISOStringSafe(todo.user.created_at),
      updated_at: toISOStringSafe(todo.user.updated_at),
      deleted_at: todo.user.deleted_at
        ? toISOStringSafe(todo.user.deleted_at)
        : undefined,
    },
    title: todo.title,
    status: todo.status as ITodoAppTodoStatus,
    completed_at: todo.completed_at
      ? toISOStringSafe(todo.completed_at)
      : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
  }));

  // Calculate pagination metadata with proper Number() conversion for brand types
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
    data: data,
  };
}
