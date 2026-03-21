import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { IMultiUserTodoTodoEditHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodoEditHistory";
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

export async function getMultiUserTodoMemberTodosTodoIdHistoryHistoryId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  historyId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoTodoEditHistory> {
  // 1. Query todo to verify existence, ownership, and non-deleted status
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      deleted_at: true,
      title: true,
      completed: true,
      start_date: true,
      due_date: true,
      created_at: true,
      member: {
        select: {
          id: true,
          display_name: true,
          email: true,
          created_at: true,
        },
      },
    },
  });
  // 2. Verify todo exists - return 404 if not found
  if (todo === null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Verify ownership - return 404 if not authorized (privacy by design)
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Not Found", 404);
  }
  // 4. Verify todo is not in trash - history not available for deleted todos
  if (todo.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 5. Query history entry by historyId
  const history =
    await MyGlobal.prisma.multi_user_todo_todo_edit_histories.findUnique({
      where: { id: props.historyId },
      select: {
        id: true,
        multi_user_todo_todo_id: true,
        created_at: true,
        old_title: true,
        new_title: true,
        old_description: true,
        new_description: true,
        old_start_date: true,
        new_start_date: true,
        old_due_date: true,
        new_due_date: true,
      },
    });
  // 6. Verify history entry exists and belongs to the requested todo
  if (history === null || history.multi_user_todo_todo_id !== props.todoId) {
    throw new HttpException("Not Found", 404);
  }
  // 7. Transform and return with nested todo summary
  return {
    id: history.id,
    created_at: history.created_at.toISOString(),
    old_title: history.old_title ?? undefined,
    new_title: history.new_title ?? undefined,
    old_description: history.old_description ?? undefined,
    new_description: history.new_description ?? undefined,
    old_start_date: history.old_start_date?.toISOString() ?? undefined,
    new_start_date: history.new_start_date?.toISOString() ?? undefined,
    old_due_date: history.old_due_date?.toISOString() ?? undefined,
    new_due_date: history.new_due_date?.toISOString() ?? undefined,
    todo: {
      id: todo.id,
      title: todo.title,
      completed: todo.completed,
      start_date: todo.start_date?.toISOString() ?? null,
      due_date: todo.due_date?.toISOString() ?? null,
      created_at: todo.created_at.toISOString(),
      member: {
        id: todo.member.id,
        displayName: todo.member.display_name,
        email: todo.member.email as string & tags.Format<"email">,
        createdAt: todo.member.created_at.toISOString(),
      },
    },
  };
}
