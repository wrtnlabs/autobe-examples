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

export async function deleteTodoAppMemberTrashTodoId(props: {
  member: MemberPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo exists, belongs to member, and is in trash
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.member.id,
      is_trashed: true,
      deleted_at: null,
    },
  });
  if (todo === null) {
    throw new HttpException("Not Found", 404);
  }
  // Delete all associated edit history entries
  await MyGlobal.prisma.todo_app_edit_history_entries.deleteMany({
    where: {
      todo_app_todo_edit_id: props.todoId,
    },
  });
  // Permanently delete the todo
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
