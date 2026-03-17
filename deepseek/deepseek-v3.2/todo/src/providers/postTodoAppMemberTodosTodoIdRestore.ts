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

export async function postTodoAppMemberTodosTodoIdRestore(props: {
  member: MemberPayload;
  todoId: string;
}): Promise<ITodoAppTodo> {
  // Verify the todo exists and belongs to this member
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: {
      id: props.todoId,
      todo_app_member_id: props.member.id,
    },
    select: { id: true },
  });
  // Check trash entry
  const trashEntry =
    await MyGlobal.prisma.todo_app_todo_trash_entries.findUnique({
      where: { todo_app_todo_id: props.todoId },
      select: {
        restored_at: true,
        permanently_deleted_at: true,
        deleted_at: true,
      },
    });
  if (!trashEntry) {
    throw new HttpException("Todo not found in trash", 404);
  }
  if (trashEntry.restored_at !== null) {
    throw new HttpException("Todo already restored", 409);
  }
  if (trashEntry.permanently_deleted_at !== null) {
    throw new HttpException("Todo permanently deleted", 410);
  }
  // Update trash entry with restoration timestamp
  const now = new Date();
  await MyGlobal.prisma.todo_app_todo_trash_entries.update({
    where: { todo_app_todo_id: props.todoId },
    data: {
      restored_at: now,
      updated_at: now,
    },
  });
  // Fetch the full todo with transformer selection
  const restoredTodo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    ...TodoAppTodoTransformer.select(),
  });
  return await TodoAppTodoTransformer.transform(restoredTodo);
}
