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

export async function deletePrivateTodoAppMemberTodosTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Query the todo to verify existence and ownership
  const todo = await MyGlobal.prisma.private_todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      user_id: true,
      deleted_at: true,
    },
  });
  // If not found, doesn't belong to user, or already deleted → 404
  // We don't reveal whether todo exists for another user (privacy)
  if (
    todo === null ||
    todo.user_id !== props.member.id ||
    todo.deleted_at !== null
  ) {
    throw new HttpException("Todo not found", 404);
  }
  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.private_todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
