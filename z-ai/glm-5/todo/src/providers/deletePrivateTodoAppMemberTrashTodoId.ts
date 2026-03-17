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

export async function deletePrivateTodoAppMemberTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the todo and verify it exists
  const todo = await MyGlobal.prisma.private_todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: { id: true, user_id: true, deleted_at: true },
  });
  // Verify ownership
  if (todo.user_id !== props.member.id) {
    throw new HttpException("Access denied", 403);
  }
  // Verify todo is in trash
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 400);
  }
  // Permanently delete the todo
  // Edit history cascade deletes automatically due to onDelete: Cascade
  await MyGlobal.prisma.private_todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
