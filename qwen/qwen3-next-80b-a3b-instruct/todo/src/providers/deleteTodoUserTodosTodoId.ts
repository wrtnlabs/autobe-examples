import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Fetch the todo item by id
  const todo = await MyGlobal.prisma.todo_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo not found.", 404);
  }
  if (todo.todo_user_id !== props.user.id) {
    throw new HttpException("Forbidden: You do not own this todo.", 403);
  }
  await MyGlobal.prisma.todo_todos.delete({
    where: { id: props.todoId },
  });
}
