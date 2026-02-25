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

export async function patchTodoAppUserTodos(props: {
  user: UserPayload;
  body: ITodoAppTodo.IRequest;
}): Promise<IPageITodoAppTodo.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 100, 1), 100);
  const skip = (page - 1) * limit;
  // Build base where clause with user scope
  const whereInput: Prisma.todo_app_todosWhereInput = {
    todo_app_user_id: props.user.id,
    deleted_at: null,
  };
  // Handle text search
  if (props.body.search) {
    whereInput.title = { contains: props.body.search, mode: "insensitive" };
  }
  // Handle completion status filtering
  const completionStatus = props.body.completion_status;
  if (completionStatus && completionStatus !== "all") {
    // Get todos IDs with their latest completion status
    const latestCompletionsSubquery =
      await MyGlobal.prisma.todo_app_todo_completions.findMany({
        where: {
          deleted_at: null,
          todo: { todo_app_user_id: props.user.id, deleted_at: null },
        },
        orderBy: { created_at: "desc" },
        distinct: ["todo_app_todo_id"],
        select: { todo_app_todo_id: true, completed: true },
      });
    const todoIdsByStatus = latestCompletionsSubquery.reduce(
      (acc, completion) => {
        if (completion.completed) {
          acc.complete.push(completion.todo_app_todo_id);
        } else {
          acc.incomplete.push(completion.todo_app_todo_id);
        }
        return acc;
      },
      { complete: [] as string[], incomplete: [] as string[] },
    );
    // Also get todos that have no completion records (considered incomplete)
    const todosWithoutCompletions =
      await MyGlobal.prisma.todo_app_todos.findMany({
        where: {
          todo_app_user_id: props.user.id,
          deleted_at: null,
          completions: { none: { deleted_at: null } },
        },
        select: { id: true },
      });
    const incompleteWithoutRecords = todosWithoutCompletions.map(
      (todo) => todo.id,
    );
    const allIncompleteTodos = [
      ...todoIdsByStatus.incomplete,
      ...incompleteWithoutRecords,
    ];
    if (completionStatus === "complete") {
      whereInput.id = { in: todoIdsByStatus.complete };
    } else {
      whereInput.id = { in: allIncompleteTodos };
    }
  }
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_todos.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_todos.count({ where: whereInput }),
  ]);
  // Transform to DTO format
  const transformedData = data.map(
    (todo) =>
      ({
        id: todo.id,
        title: todo.title,
        created_at: toISOStringSafe(todo.created_at),
        updated_at: toISOStringSafe(todo.updated_at),
        deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : null,
      }) satisfies ITodoAppTodo.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageITodoAppTodo.ISummary;
}
