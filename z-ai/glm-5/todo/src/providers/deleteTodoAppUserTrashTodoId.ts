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

export async function deleteTodoAppUserTrashTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<void> {
  // Find and validate the todo exists, belongs to user, and is in trash
  // findFirstOrThrow throws 404 if todo doesn't exist, not owned by user, or not in trash
  await MyGlobal.prisma.todo_app_todos.findFirstOrThrow({
    where: {
      id: props.todoId,
      user_id: props.user.id,
      is_deleted: true,
    },
  });
  // Permanently delete the todo
  // Cascade delete (onDelete: Cascade) automatically removes all todo_app_todo_histories entries
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
