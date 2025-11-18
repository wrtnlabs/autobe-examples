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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };

  // Apply text search if provided and not empty
  if (props.body.search !== undefined && props.body.search.length > 0) {
    whereConditions.text = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  // Apply completion filter if provided
  if (props.body.completed !== undefined) {
    whereConditions.completed = props.body.completed;
  }

  // Build orderBy conditions
  let orderBy: Prisma.todo_app_todosOrderByWithRelationInput = {};

  if (props.body.sort_by) {
    const order = props.body.order ?? "desc";
    orderBy[props.body.sort_by] = order;
  } else {
    // Default sorting by creation date descending
    orderBy.created_at = "desc";
  }

  try {
    // Execute queries concurrently
    const [data, total] = await Promise.all([
      MyGlobal.prisma.todo_app_todos.findMany({
        where: whereConditions,
        skip,
        take: limit,
        orderBy,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              status: true,
              last_login_at: true,
            },
          },
        },
      }),
      MyGlobal.prisma.todo_app_todos.count({
        where: whereConditions,
      }),
    ]);

    // Convert to API response format
    const paginatedData = data.map((todo) => ({
      id: todo.id as string & tags.Format<"uuid">,
      text: todo.text,
      completed: todo.completed,
      created_at: toISOStringSafe(todo.created_at),
      updated_at: toISOStringSafe(todo.updated_at),
      deleted_at: todo.deleted_at
        ? toISOStringSafe(todo.deleted_at)
        : toISOStringSafe(new Date(0)),
      user: todo.user
        ? {
            id: todo.user.id as string & tags.Format<"uuid">,
            email: todo.user.email as string & tags.Format<"email">,
            name: todo.user.name,
            status: todo.user.status,
            last_login_at: todo.user.last_login_at
              ? toISOStringSafe(todo.user.last_login_at)
              : undefined,
          }
        : undefined,
    }));

    return {
      pagination: {
        current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
        limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
        records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
        pages: Math.ceil(total / limit) as number &
          tags.Type<"int32"> &
          tags.Minimum<0>,
      },
      data: paginatedData,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve todos", 500);
  }
}
