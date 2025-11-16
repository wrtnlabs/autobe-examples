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

export async function patchTodosSearch(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Set default pagination values
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build the WHERE condition
  const whereCondition = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
    ...(props.body.search && {
      OR: [
        {
          title: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          description: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
    ...(props.body.due_before && { due_date: { lte: props.body.due_before } }),
    ...(props.body.due_after && { due_date: { gte: props.body.due_after } }),
  };

  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        user: true,
        userSession: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: whereCondition,
    }),
  ]);

  // Transform data to match API interface
  const transformedData = data.map((todo) => ({
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
          expired_at: toISOStringSafe(
            todo.userSession.expired_at ?? new Date(),
          ),
        }
      : undefined,
    title: todo.title,
    description: todo.description ?? undefined,
    due_date: todo.due_date ? toISOStringSafe(todo.due_date) : undefined,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : undefined,
  }));

  // Calculate pagination info
  const pages = Math.ceil(total / limit);

  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
  };
}
