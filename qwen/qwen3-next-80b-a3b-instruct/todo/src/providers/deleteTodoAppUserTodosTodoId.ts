import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string;
}): Promise<void> {
  // Find the todo item by ID
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });

  // If todo doesn't exist, return 404
  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }

  // Check if user is owner
  if (todo.user_id !== props.user.id) {
    throw new HttpException(
      "You do not have permission to delete this todo item",
      403,
    );
  }

  // Perform hard delete
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
