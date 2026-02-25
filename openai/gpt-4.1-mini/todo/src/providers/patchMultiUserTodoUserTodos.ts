import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMultiUserTodoTodo";
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

export async function patchMultiUserTodoUserTodos(props: {
  user: UserPayload;
  body: IMultiUserTodoTodo.IRequest;
}): Promise<IPageIMultiUserTodoTodo.ISummary> {
  const userId = props.user.id;
  const {
    completionStatus = "all",
    sortBy = "creationDate",
    sortOrder = "asc",
    page = 1,
    pageSize = 20,
    limit,
  } = props.body;
  const whereConditions: Prisma.multi_user_todo_todosWhereInput = {
    multi_user_todo_user_id: userId,
    deleted_at: null,
  };
  if (completionStatus === "complete") {
    whereConditions.completed = true;
  } else if (completionStatus === "incomplete") {
    whereConditions.completed = false;
  }
  type SortField = "creationDate" | "startDate" | "dueDate";
  type SortOrder = "asc" | "desc";
  const orderByMap: Record<
    SortField,
    Prisma.multi_user_todo_todosOrderByWithRelationInput
  > = {
    creationDate: { created_at: sortOrder },
    startDate: { start_date: sortOrder },
    dueDate: { due_date: sortOrder },
  };
  const orderBy = orderByMap[sortBy];
  const normalizedPage: number = page >= 1 ? page : 1;
  const normalizedLimit: number = (() => {
    if (limit !== null && limit !== undefined) {
      return limit >= 0 ? limit : 20;
    } else if (pageSize >= 1 && pageSize <= 100) {
      return pageSize;
    } else {
      return 20;
    }
  })();
  const skip: number = (normalizedPage - 1) * normalizedLimit;
  const todos = await MyGlobal.prisma.multi_user_todo_todos.findMany({
    where: whereConditions,
    orderBy,
    skip,
    take: normalizedLimit,
    select: {
      id: true,
      title: true,
      completed: true,
      start_date: true,
      due_date: true,
      created_at: true,
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  const total: number = await MyGlobal.prisma.multi_user_todo_todos.count({
    where: whereConditions,
  });
  function toDateTimeString(
    date: Date | null,
  ): (string & tags.Format<"date-time">) | undefined {
    if (date === null) return undefined;
    return toISOStringSafe(date) as string & tags.Format<"date-time">;
  }
  function toNullableDateTimeString(
    date: Date | null,
  ): (string & tags.Format<"date-time">) | null {
    if (date === null) return null;
    return toISOStringSafe(date) as string & tags.Format<"date-time">;
  }
  const data: IMultiUserTodoTodo.ISummary[] = todos.map((todo) => ({
    id: todo.id,
    title: todo.title,
    completed: todo.completed,
    startDate: toDateTimeString(todo.start_date),
    dueDate: toDateTimeString(todo.due_date),
    createdAt: toISOStringSafe(todo.created_at) as string &
      tags.Format<"date-time">,
    user: {
      id: todo.user.id,
      email: todo.user.email,
      displayName: todo.user.display_name,
      createdAt: toISOStringSafe(todo.user.created_at) as string &
        tags.Format<"date-time">,
      updatedAt: toISOStringSafe(todo.user.updated_at) as string &
        tags.Format<"date-time">,
      deletedAt:
        todo.user.deleted_at === null
          ? null
          : (toISOStringSafe(todo.user.deleted_at) as string &
              tags.Format<"date-time">),
    },
  }));
  return {
    pagination: {
      current: normalizedPage,
      limit: normalizedLimit,
      records: total,
      pages: Math.ceil(total / normalizedLimit),
    },
    data,
  };
}
