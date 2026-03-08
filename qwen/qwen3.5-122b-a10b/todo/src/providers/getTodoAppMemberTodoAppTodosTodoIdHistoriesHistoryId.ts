import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppTodoHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodoHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getTodoAppMemberTodoAppTodosTodoIdHistoriesHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<ITodoAppTodoHistory> {
  const history =
    await MyGlobal.prisma.todo_app_todo_histories.findUniqueOrThrow({
      where: { id: props.historyId },
      select: {
        id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        title: true,
        description: true,
        start_date: true,
        due_date: true,
        completed: true,
        todo: {
          select: {
            id: true,
            todo_app_member_id: true,
            title: true,
            description: true,
            start_date: true,
            due_date: true,
            completed: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    });
  if (history.todo.id !== props.todoId) {
    throw new HttpException("Not Found", 404);
  }
  if (history.todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  if (history.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: history.id,
    todo: {
      id: history.todo.id,
      title: history.todo.title,
      description: history.todo.description ?? null,
      start_date: history.todo.start_date
        ? toISOStringSafe(history.todo.start_date)
        : null,
      due_date: history.todo.due_date
        ? toISOStringSafe(history.todo.due_date)
        : null,
      completed: history.todo.completed,
      created_at: toISOStringSafe(history.todo.created_at),
      updated_at: toISOStringSafe(history.todo.updated_at),
      deleted_at: history.todo.deleted_at
        ? toISOStringSafe(history.todo.deleted_at)
        : null,
    } satisfies ITodoAppTodo.ISummary,
    created_at: toISOStringSafe(history.created_at),
    updated_at: toISOStringSafe(history.updated_at),
    deleted_at: history.deleted_at ? toISOStringSafe(history.deleted_at) : null,
    title: history.title,
    description: history.description,
    start_date: history.start_date ? toISOStringSafe(history.start_date) : null,
    due_date: history.due_date ? toISOStringSafe(history.due_date) : null,
    completed: history.completed,
  } satisfies ITodoAppTodoHistory;
}
