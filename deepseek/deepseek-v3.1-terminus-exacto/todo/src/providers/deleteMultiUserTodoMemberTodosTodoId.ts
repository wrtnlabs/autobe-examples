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

export async function deleteMultiUserTodoMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify the todo exists and belongs to the authenticated member
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findFirst({
    where: {
      id: props.todoId,
      multi_user_todo_member_id: props.member.id,
    },
    select: {
      id: true,
      deleted_at: true,
      trashEntry: {
        select: { id: true },
      },
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Check if todo is already deleted
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo already deleted", 400);
  }
  const now = new Date();
  // Check if trash entry already exists (should not happen but defensive)
  if (!todo.trashEntry) {
    // Create trash entry
    await MyGlobal.prisma.multi_user_todo_todo_trash_entries.create({
      data: {
        id: v4(),
        multi_user_todo_todo_id: props.todoId,
        deleted_at: now,
        restored_at: null,
        permanently_deleted_at: null,
        created_at: now,
        updated_at: now,
      },
    });
  }
  // Update todo with deleted_at timestamp
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
