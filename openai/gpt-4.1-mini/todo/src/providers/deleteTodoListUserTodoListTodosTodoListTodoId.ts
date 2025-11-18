import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListTodosTodoListTodoId(props: {
  user: UserPayload;
  todoListTodoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoListTodoId },
  });

  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }

  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.todoListTodoId },
  });
}
