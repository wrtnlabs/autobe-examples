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
  // Lookup the todo by ID and ownership for the current user
  const todo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!todo) {
    throw new HttpException("Todo not found or already deleted.", 404);
  }

  // Soft delete the todo by updating deleted_at to current ISO string
  await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
