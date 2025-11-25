import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_app_todos.findUnique({
    where: { id: props.todoId },
  });
  if (!todo) {
    throw new HttpException("Todo item not found.", 404);
  }
  if (todo.todo_app_user_id !== props.user.id) {
    throw new HttpException(
      "You are not authorized to delete this todo item.",
      403,
    );
  }
  await MyGlobal.prisma.todo_app_todos.delete({
    where: { id: props.todoId },
  });
}
