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
  // Find todo and check ownership + trash status
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_app_member_id: true,
      deleted_at: true,
    },
  });
  // 404 if todo doesn't exist
  if (todo === null) {
    throw new HttpException("Todo not found", 404);
  }
  // 403 if member doesn't own the todo
  if (todo.todo_app_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 400 if todo is not in trash
  if (todo.deleted_at === null) {
    throw new HttpException("Todo is not in trash", 400);
  }
  // Delete todo - CASCADE handles todo_app_todo_histories automatically
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
