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
  // Find the todo - findUniqueOrThrow auto-generates 404 on not found
  const todo = await MyGlobal.prisma.todo_app_todos.findUniqueOrThrow({
    where: { id: props.todoId },
  });
  // Validate ownership
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate not already deleted
  if (todo.deleted_at !== null) {
    throw new HttpException("Todo not found", 404);
  }
  // Soft delete: set deleted_at and updated_at
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
