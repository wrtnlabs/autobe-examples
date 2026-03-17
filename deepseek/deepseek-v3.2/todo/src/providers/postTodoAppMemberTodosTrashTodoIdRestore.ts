import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ITodoAppMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMember";
import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { TodoAppTodoTransformer } from "../transformers/TodoAppTodoTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postTodoAppMemberTodosTrashTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  // Get current timestamp as Date object for Prisma
  const now = new Date();
  // Use transaction for atomicity
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Verify todo exists and belongs to member
    const todo = await tx.todo_app_todos.findUnique({
      where: { id: props.todoId },
      select: {
        id: true,
        todo_app_member_id: true,
      },
    });
    if (!todo) {
      throw new HttpException("Todo not found", 404);
    }
    if (todo.todo_app_member_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
    // 2. Check trash entry exists and is restorable
    const trashEntry = await tx.todo_app_todo_trash_entries.findUnique({
      where: { todo_app_todo_id: props.todoId },
    });
    if (!trashEntry) {
      throw new HttpException("Todo not found in trash", 404);
    }
    if (trashEntry.restored_at !== null) {
      throw new HttpException("Todo already restored from trash", 400);
    }
    if (trashEntry.permanently_deleted_at !== null) {
      throw new HttpException("Todo permanently deleted from trash", 410);
    }
    // 3. Update trash entry with restoration timestamp
    await tx.todo_app_todo_trash_entries.update({
      where: { id: trashEntry.id },
      data: {
        restored_at: now,
        updated_at: now,
      },
    });
    // 4. Optionally remove corresponding record from todo_app_todo_trash_items
    // (keeping for audit as per specification guidance)
    // The specification says "optionally remove" so we'll keep it
    // 5. Fetch the restored todo with full data including member relation
    const restoredTodo = await tx.todo_app_todos.findUniqueOrThrow({
      where: { id: props.todoId },
      ...TodoAppTodoTransformer.select(),
    });
    return await TodoAppTodoTransformer.transform(restoredTodo);
  });
}
