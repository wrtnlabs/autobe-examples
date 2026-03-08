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
  // Verify the todo exists and belongs to the authenticated member
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: { id: true, todo_app_member_id: true, deleted_at: true },
  });
  // Todo not found or belongs to another user -> 404
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // Verify ownership
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Todo not found", 404);
  }
  // Check if already soft deleted
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo is already in trash", 400);
  }
  // Perform soft delete
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
