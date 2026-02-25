import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodo";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
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

export async function patchTodoAppUserFilters(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  // Validate and set pagination parameters
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(Math.max(1, props.body.limit ?? 100), 100);
  const skip = (page - 1) * limit;
  // Base where condition for user isolation and soft deletion
  const whereBase: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };
  // Add text search if provided
  const whereWithSearch: Prisma.todo_app_todosWhereInput = props.body.search
    ? {
        ...whereBase,
        title: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }
    : whereBase;
  // Handle completion status filtering with optimized query
  let finalWhere: Prisma.todo_app_todosWhereInput = whereWithSearch;
  if (props.body.completion_status && props.body.completion_status !== "all") {
    const targetCompletion = props.body.completion_status === "complete";
    // Use subquery to find todos with latest completion status
    finalWhere = {
      ...whereWithSearch,
      completions: {
        some: {
          deleted_at: null,
          todo_app_todo_id: {
            equals:
              MyGlobal.prisma.todo_app_todo_completions.fields.todo_app_todo_id,
          },
          completed: targetCompletion,
          created_at: {
            equals: MyGlobal.prisma.todo_app_todo_completions.fields.created_at,
          },
        },
      },
    };
    // For incomplete status, also include todos with no completion records
    if (props.body.completion_status === "incomplete") {
      finalWhere = {
        OR: [
          finalWhere,
          {
            ...whereWithSearch,
            completions: {
              none: {
                deleted_at: null,
              },
            },
          },
        ],
      } satisfies Prisma.todo_app_todosWhereInput;
    }
  }
  // Execute queries in parallel for better performance
  const [todos, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: finalWhere,
      skip: skip,
      take: limit,
      orderBy: {
        created_at: "desc",
      },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({
      where: finalWhere,
    }),
  ]);
  // Transform to DTO format using proper date utilities
  const data: ITodoAppTodo.ISummary[] = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : null,
  }));
  return {
    data: data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
