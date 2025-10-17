import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoTodo";
import { IETodoPriority } from "@ORGANIZATION/PROJECT-api/lib/structures/IETodoPriority";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoTodo.ITodoUpdate;
}): Promise<ITodoTodo> {
  // Verify the member owns this todo item
  const existingTodo = await MyGlobal.prisma.todo_todos.findFirst({
    where: {
      id: props.todoId,
      member_id: props.member.id,
    },
    select: {
      id: true,
      member_id: true,
      title: true,
      completed: true,
      priority: true,
      created_at: true,
      updated_at: true,
      completed_at: true,
    },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found or access denied", 404);
  }

  // Prepare update data with current timestamp
  const now = toISOStringSafe(new Date());

  // Build update object completely
  const updateData: Prisma.todo_todosUpdateInput = {
    updated_at: now,
  };

  // Handle title update
  if (props.body.title !== undefined) {
    updateData.title = props.body.title;
  }

  // Handle completion status update with automatic completed_at management
  if (props.body.completed !== undefined) {
    updateData.completed = props.body.completed;
    if (props.body.completed) {
      updateData.completed_at = now;
    } else {
      updateData.completed_at = null;
    }
  }

  // Handle priority update
  if (props.body.priority !== undefined) {
    updateData.priority = props.body.priority as string;
  }

  // Perform the update
  const updated = await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: updateData,
  });

  // Return the updated todo with proper type conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    member_id: updated.member_id as string & tags.Format<"uuid">,
    title: updated.title,
    completed: updated.completed,
    priority: updated.priority as IETodoPriority,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    completed_at: updated.completed_at
      ? toISOStringSafe(updated.completed_at)
      : null,
  };
}
