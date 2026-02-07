import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppTodoEditHistory";
import { ITodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoEditHistory";
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

export async function getTodoAppUserTodosTodoIdHistory(props: {
  user: UserPayload;
  todoId: string;
}): Promise<IPageITodoAppTodoEditHistory.ISummary> {
  // Find the todo item to verify ownership
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_app_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query edit history entries
  const historyRecords =
    await MyGlobal.prisma.todo_app_todo_edit_histories.findMany({
      where: {
        todo_id: props.todoId,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: 0,
      take: 100,
    });
  const total = await MyGlobal.prisma.todo_app_todo_edit_histories.count({
    where: {
      todo_id: props.todoId,
    },
  });
  // Transform to response format
  const data = historyRecords.map((record) => ({
    id: record.id as string & tags.Format<"uuid">,
    title_before: record.title_before,
    description_before: record.description_before,
    start_date_before: record.start_date_before
      ? toISOStringSafe(record.start_date_before)
      : null,
    due_date_before: record.due_date_before
      ? toISOStringSafe(record.due_date_before)
      : null,
    created_at: toISOStringSafe(record.created_at),
    user_id: record.user_id as string & tags.Format<"uuid">,
  }));
  return {
    data: data,
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    },
  };
}
