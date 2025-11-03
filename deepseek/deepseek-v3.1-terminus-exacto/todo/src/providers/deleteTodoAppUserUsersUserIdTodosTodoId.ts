import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserUsersUserIdTodosTodoId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, userId, todoId } = props;

  // Authorization: User can only delete their own todos
  if (user.id !== userId) {
    throw new HttpException(
      "Unauthorized: You can only delete your own todos",
      403,
    );
  }

  // Verify todo exists and belongs to authenticated user
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: {
      id: todoId,
      todo_app_user_id: userId,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found or already deleted", 404);
  }

  // Perform soft delete with current timestamp
  await MyGlobal.prisma.todo_app_todos.update({
    where: { id: todoId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
