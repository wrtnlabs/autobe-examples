import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoListTodoUserTodosTodoId(props: {
  todoUser: TodouserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { todoUser, todoId } = props;

  // Step 1: Find the todo by ID and ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: todoId,
      todo_list_todouser_id: todoUser.id,
    },
    select: { id: true },
  });

  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }

  // Step 2: Hard delete (permanently remove)
  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: todoId },
  });
}
