import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<void> {
  // Verify the todo exists and belongs to the requesting user
  const todo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found or access denied", 404);
  }
  // Permanently delete associated edit history entries
  await MyGlobal.prisma.todo_app_todo_edit_histories.deleteMany({
    where: { todo_id: props.todoId },
  });
  // Permanently delete trash entry (if exists)
  await MyGlobal.prisma.todo_app_todo_trashes.deleteMany({
    where: { todo_id: props.todoId },
  });
  // Permanently delete the todo record
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
