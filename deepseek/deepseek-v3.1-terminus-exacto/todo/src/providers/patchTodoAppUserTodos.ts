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
import { ITodoAppUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserSession";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Validate pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.max(1, Math.min(100, props.body.limit ?? 100));
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };

  // Add text search if provided
  if (props.body.search && props.body.search.trim().length > 0) {
    whereConditions.OR = [
      { title: { contains: props.body.search } },
      { description: { contains: props.body.search } },
    ];
  }

  // Add due date filtering
  if (props.body.due_before || props.body.due_after) {
    whereConditions.due_date = {};

    if (props.body.due_before) {
      whereConditions.due_date.lte = props.body.due_before;
    }

    if (props.body.due_after) {
      whereConditions.due_date.gte = props.body.due_after;
    }
  }

  try {
    // Execute queries concurrently
    const [data, total] = await Promise.all([
      MyGlobal.prisma.todo_app_todos.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          user: true,
          userSession: true,
        },
      }),
      MyGlobal.prisma.todo_app_todos.count({
        where: whereConditions,
      }),
    ]);

    // Transform results with proper type flow
    const transformedData: ITodoAppTodo.ISummary[] = data.map((todo) => ({
      id: todo.id,
      user: {
        id: todo.user.id,
        email: todo.user.email,
        status: todo.user.status,
        created_at: toISOStringSafe(todo.user.created_at),
      },
      session: todo.userSession
        ? {
            id: todo.userSession.id,
            ip: todo.userSession.ip,
            href: todo.userSession.href,
            referrer: todo.userSession.referrer,
            created_at: toISOStringSafe(todo.userSession.created_at),
            expired_at: todo.userSession.expired_at
              ? toISOStringSafe(todo.userSession.expired_at)
              : toISOStringSafe(new Date(0)), // Provide default value when expired_at is null/undefined
          }
        : undefined,
      title: todo.title,
      description: todo.description ?? undefined,
      due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      deleted_at: todo.deleted_at
        ? toISOStringSafe(todo.deleted_at)
        : undefined,
    }));

    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data: transformedData,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve todo items", 500);
  }
}
