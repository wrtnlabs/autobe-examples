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
  todoId: string;
}): Promise<void> {
  // 1. Verify todo ownership and existence
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: {
      id: true,
      todo_app_member_id: true,
    },
  });
  // 2. Check if todo already in trash
  const existingTrashEntry =
    await MyGlobal.prisma.todo_app_todo_trash_entries.findUnique({
      where: { todo_app_todo_id: props.todoId },
    });
  if (existingTrashEntry && existingTrashEntry.deleted_at !== null) {
    throw new HttpException("Todo already in trash", 400);
  }
  // 3. Begin transaction for atomic soft deletion
  await MyGlobal.prisma.$transaction(async (tx) => {
    const now = new Date();
    // Create trash entry (audit trail)
    await tx.todo_app_todo_trash_entries.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        todo_app_member_id: props.member.id,
        deleted_at: now,
        restored_at: null,
        permanently_deleted_at: null,
        created_at: now,
        updated_at: now,
      },
    });
    // Create trash item (trash view)
    await tx.todo_app_todo_trash_items.create({
      data: {
        id: v4(),
        todo_app_todo_id: props.todoId,
        deleted_at: now,
        reason: null,
        created_at: now,
        updated_at: now,
      },
    });
  });
}
