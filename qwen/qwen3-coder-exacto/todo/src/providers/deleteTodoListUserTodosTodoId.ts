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
  // Find the todo item by ID
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Ensure the authenticated user is the owner
  if (todo.user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You do not have permission to delete this todo.",
      403,
    );
  }

  // Permanently delete the todo item
  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.todoId },
  });
}
