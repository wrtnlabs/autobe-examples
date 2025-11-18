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
  // Lookup todo strictly by id and owner
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      user_id: props.user.id,
    },
  });
  if (!todo) {
    throw new HttpException("Todo item not found", 404);
  }
  // Permanent deletion (hard delete)
  await MyGlobal.prisma.todo_list_todos.delete({
    where: {
      id: props.todoId,
    },
  });
}
