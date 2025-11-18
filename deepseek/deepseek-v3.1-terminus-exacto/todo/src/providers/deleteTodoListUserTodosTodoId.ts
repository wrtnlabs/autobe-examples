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
  // Verify the todo exists and belongs to the user
  const existingTodo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify ownership
  if (existingTodo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  // Perform hard deletion
  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.todoId },
  });
}
