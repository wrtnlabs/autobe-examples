import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoMember";
import { IMultiUserTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MultiUserTodoTodoCompletionStatusCollector } from "../collectors/MultiUserTodoTodoCompletionStatusCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { MultiUserTodoTodoTransformer } from "../transformers/MultiUserTodoTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMultiUserTodoMemberTodosTodoIdCompletionStatuses(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: IMultiUserTodoTodo.ICompletionStatus;
}): Promise<IMultiUserTodoTodo> {
  // 1. Verify todo exists, belongs to member, and is not in trash
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      is_completed: true,
      deleted_at: true,
    },
  });
  // Ownership check
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Trash check - reject if soft-deleted
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo is in trash", 400);
  }
  // 2. Calculate new completion status (toggle)
  const newIsCompleted = !todo.is_completed;
  // 3. Execute transaction: update todo + create audit trail
  const updatedTodo = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update todo completion status
    await tx.multi_user_todo_todos.update({
      where: { id: props.todoId },
      data: {
        is_completed: newIsCompleted,
        updated_at: new Date(),
      },
    });
    // Create audit entry in completion_statuses
    await tx.multi_user_todo_todo_completion_statuses.create({
      data: await MultiUserTodoTodoCompletionStatusCollector.collect({
        body: { is_completed: newIsCompleted },
        multiUserTodoTodos: { id: props.todoId },
        multiUserTodoMembers: { id: props.member.id },
      }),
    });
    // Fetch updated todo with full details for response
    const fullTodo = await tx.multi_user_todo_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...MultiUserTodoTodoTransformer.select(),
    });
    return fullTodo;
  });
  // 4. Transform and return
  return await MultiUserTodoTodoTransformer.transform(updatedTodo);
}
