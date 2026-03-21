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
  // 1. Find the todo - throws 404 if not found
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      deleted_at: true,
    },
  });
  // 2. Check if already in trash
  if (todo.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Verify ownership - 403 Forbidden if mismatch
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Soft delete - set deleted_at timestamp (cascade preserves edit histories)
  await MyGlobal.prisma.multi_user_todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: new Date(),
    },
  });
}
