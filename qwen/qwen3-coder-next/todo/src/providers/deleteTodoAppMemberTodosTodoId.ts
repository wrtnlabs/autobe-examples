import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  // Find and verify the todo belongs to the current member
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId, todo_app_user_id: props.member.id },
  });
  // Check if already trashed (idempotent operation)
  if (todo.is_trashed) {
    return;
  }
  // Perform soft delete with transaction
  await MyGlobal.prisma.$transaction([
    // Update the todo to mark as trashed
    MyGlobal.prisma.todo_app_todos.update({
      where: { id: props.todoId },
      data: {
        is_trashed: true,
        updated_at: now,
      },
    }),
    // Create trash entry
    MyGlobal.prisma.todo_app_todo_trashes.create({
      data: {
        id: v4(),
        todo_id: props.todoId,
        deleted_at: now,
        created_at: now,
        updated_at: now,
      },
    }),
  ]);
}
