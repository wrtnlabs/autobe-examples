import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoItemsTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const deletedTodo = await MyGlobal.prisma.todo_list_todos.delete({
    where: {
      id: props.todoId,
      todo_list_users_id: props.user.id,
    },
  });

  if (!deletedTodo) {
    throw new HttpException("Todo item not found or not authorized", 404);
  }
}
