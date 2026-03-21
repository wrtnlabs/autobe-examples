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

export async function deleteMultiUserTodoMemberTodosTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the todo and verify it exists in trash (deleted_at NOT NULL)
  const todo = await MyGlobal.prisma.multi_user_todo_todos.findUniqueOrThrow({
    where: { id: props.todoId },
    select: {
      id: true,
      multi_user_todo_member_id: true,
      deleted_at: true,
    },
  });
  // Verify todo is in trash
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 404);
  }
  // Verify ownership - member can only delete their own todos
  if (todo.multi_user_todo_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Delete the todo - cascade will handle associated edit histories
  await MyGlobal.prisma.multi_user_todo_todos.delete({
    where: { id: props.todoId },
  });
}
