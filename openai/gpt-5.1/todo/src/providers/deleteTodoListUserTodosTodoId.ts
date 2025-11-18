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
  // Fetch the target todo by UUID
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
  });

  // If not found, return 404
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Check ownership: only allow the owner to delete
  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden: you do not own this todo", 403);
  }

  // Permanently delete the todo
  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.todoId },
  });
}
