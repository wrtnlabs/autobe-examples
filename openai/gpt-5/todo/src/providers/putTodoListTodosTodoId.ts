import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { TodomemberPayload } from "../decorators/payload/TodomemberPayload";

export async function putTodoListTodosTodoId(props: {
  todoMember: TodomemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  const { todoMember, todoId, body } = props;

  const existing = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      todo_list_todo_member_id: todoMember.id,
    },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  const titleProvided = body.title !== undefined;
  const isCompletedProvided = body.is_completed !== undefined;

  const titleChanged = titleProvided ? body.title !== existing.title : false;
  const isCompletedChanged = isCompletedProvided
    ? body.is_completed !== existing.is_completed
    : false;

  if (!titleChanged && !isCompletedChanged) {
    return {
      id: existing.id as string & tags.Format<"uuid">,
      title: existing.title,
      isCompleted: existing.is_completed,
      createdAt: toISOStringSafe(existing.created_at),
      updatedAt: toISOStringSafe(existing.updated_at),
      completedAt: existing.completed_at
        ? toISOStringSafe(existing.completed_at)
        : null,
    };
  }

  const now = toISOStringSafe(new Date());

  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todoId },
    data: {
      ...(titleChanged ? { title: body.title! } : {}),
      ...(isCompletedChanged ? { is_completed: body.is_completed! } : {}),
      ...(isCompletedChanged
        ? { completed_at: body.is_completed ? now : null }
        : {}),
      updated_at: now,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    title: updated.title,
    isCompleted: updated.is_completed,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    completedAt: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
  };
}
