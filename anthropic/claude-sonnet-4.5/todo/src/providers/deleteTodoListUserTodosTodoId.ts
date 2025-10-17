import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoId } = props;

  // Fetch the todo to verify it exists and is not already deleted
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify ownership - user can only delete their own todos
  if (todo.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own todos",
      403,
    );
  }

  // Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todoId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
