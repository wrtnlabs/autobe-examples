import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // First, find the todo to verify it exists and belongs to the user
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
    },
  });

  // If todo doesn't exist or doesn't belong to the user, throw 404
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Perform hard delete
  await MyGlobal.prisma.todo_list_todos.delete({
    where: {
      id: props.todoId,
    },
  });
}
