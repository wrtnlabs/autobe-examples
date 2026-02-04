import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify todo exists
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  // Verify todo isn't already deleted
  if (todo.deleted_at) {
    throw new HttpException("Todo already deleted", 409);
  }
  // Verify user owns the todo
  if (todo.todo_users_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - You can only delete your own todos",
      403,
    );
  }
  // Perform soft delete by setting 'deleted_at' to current time and updating timestamp
  await MyGlobal.prisma.todo_todos.update({
    where: { id: props.todoId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
