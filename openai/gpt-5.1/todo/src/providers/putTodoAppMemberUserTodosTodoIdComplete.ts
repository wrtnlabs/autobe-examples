import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putTodoAppMemberUserTodosTodoIdComplete(props: {
  memberUser: MemberuserPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  const memberUserId = props.memberUser.id;

  // Locate the todo owned by this member user, excluding soft-deleted items.
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_memberuser_id: memberUserId,
      deleted_at: null,
    },
  });

  if (existingTodo === null) {
    throw new HttpException("Todo not found", 404);
  }

  // Determine whether an update is needed or we can treat the request as idempotent.
  const now = new Date();
  const isAlreadyCompleted = existingTodo.state === "completed";
  const shouldUpdateState = !isAlreadyCompleted;
  const shouldRepairCompletedAt =
    isAlreadyCompleted && existingTodo.completed_at === null;

  let finalTodo = existingTodo;

  if (shouldUpdateState || shouldRepairCompletedAt) {
    finalTodo = await MyGlobal.prisma.todo_app_todos.update({
      where: {
        id: existingTodo.id,
      },
      data: {
        state: "completed",
        completed_at:
          shouldUpdateState || shouldRepairCompletedAt
            ? now
            : existingTodo.completed_at,
        updated_at: now,
      },
    });
  }

  const owner = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: {
      id: finalTodo.todo_app_memberuser_id,
    },
  });

  if (owner === null) {
    throw new HttpException("Owner member user not found", 500);
  }

  const ownerSummary: ITodoAppMemberUser.ISummary = {
    id: owner.id,
    email: owner.email,
    display_name: owner.display_name === null ? null : owner.display_name,
    status: owner.status,
    created_at: toISOStringSafe(owner.created_at),
  };

  return {
    id: finalTodo.id,
    memberUser: ownerSummary,
    title: finalTodo.title,
    description: finalTodo.description === null ? null : finalTodo.description,
    state: finalTodo.state,
    due_date:
      finalTodo.due_date === null ? null : toISOStringSafe(finalTodo.due_date),
    created_at: toISOStringSafe(finalTodo.created_at),
    updated_at: toISOStringSafe(finalTodo.updated_at),
    completed_at:
      finalTodo.completed_at === null
        ? null
        : toISOStringSafe(finalTodo.completed_at),
    deleted_at:
      finalTodo.deleted_at === null
        ? null
        : toISOStringSafe(finalTodo.deleted_at),
  };
}
