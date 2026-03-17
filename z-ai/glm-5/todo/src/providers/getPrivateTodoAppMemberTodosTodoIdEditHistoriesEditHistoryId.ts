import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPrivateTodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodo";
import { IPrivateTodoAppTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPrivateTodoAppTodoEditHistory";
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

export async function getPrivateTodoAppMemberTodosTodoIdEditHistoriesEditHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  editHistoryId: string & tags.Format<"uuid">;
}): Promise<IPrivateTodoAppTodoEditHistory> {
  const editHistory =
    await MyGlobal.prisma.private_todo_app_todo_edit_histories.findUniqueOrThrow(
      {
        where: {
          id: props.editHistoryId,
          private_todo_app_todo_id: props.todoId,
        },
        select: {
          id: true,
          created_at: true,
          title: true,
          description: true,
          start_date: true,
          due_date: true,
          todo: {
            select: {
              id: true,
              user_id: true,
              title: true,
              completed: true,
              start_date: true,
              due_date: true,
              created_at: true,
            },
          },
        },
      },
    );
  if (editHistory.todo.user_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return {
    id: editHistory.id,
    created_at: editHistory.created_at.toISOString(),
    title: editHistory.title,
    description: editHistory.description,
    start_date: editHistory.start_date?.toISOString() ?? null,
    due_date: editHistory.due_date?.toISOString() ?? null,
    todo: {
      id: editHistory.todo.id,
      title: editHistory.todo.title,
      completed: editHistory.todo.completed,
      start_date: editHistory.todo.start_date?.toISOString() ?? null,
      due_date: editHistory.todo.due_date?.toISOString() ?? null,
      created_at: editHistory.todo.created_at.toISOString(),
    } satisfies IPrivateTodoAppTodo.ISummary,
  } satisfies IPrivateTodoAppTodoEditHistory;
}
