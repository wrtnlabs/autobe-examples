import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoAppUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoAppTodo.IUpdate;
}): Promise<ITodoAppTodo> {
  // Verify the todo exists and belongs to the user
  const existingTodo = await MyGlobal.prisma.todo_app_todos.findFirst({
    where: {
      id: props.todoId,
      todo_app_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // Check if any fields are being updated
  if (props.body.text === undefined && props.body.completed === undefined) {
    throw new HttpException("No fields provided for update", 400);
  }

  // Perform the update with proper typing
  const updatedTodo = await MyGlobal.prisma.todo_app_todos.update({
    where: { id: props.todoId },
    data: {
      ...(props.body.text !== undefined && { text: props.body.text }),
      ...(props.body.completed !== undefined && {
        completed: props.body.completed,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated todo with proper formatting
  return {
    id: updatedTodo.id,
    text: updatedTodo.text,
    completed: updatedTodo.completed,
    created_at: toISOStringSafe(updatedTodo.created_at),
    updated_at: toISOStringSafe(updatedTodo.updated_at),
    deleted_at: updatedTodo.deleted_at
      ? toISOStringSafe(updatedTodo.deleted_at)
      : undefined,
  };
}
