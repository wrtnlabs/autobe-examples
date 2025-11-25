import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserUsersUserIdTodosTodoId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListUserTodo.IUpdate;
}): Promise<ITodoListUserTodo> {
  // Verify the authenticated user matches the userId in the path
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only update your own todos",
      403,
    );
  }

  // Find the existing todo item
  const existingTodo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
    },
  });

  // Check if the todo exists
  if (!existingTodo) {
    throw new HttpException("Todo not found", 404);
  }

  // Verify the todo belongs to the authenticated user
  if (existingTodo.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only update your own todos",
      403,
    );
  }

  // Update the todo item with inline parameters
  const updatedTodo = await MyGlobal.prisma.todo_list_todos.update({
    where: {
      id: props.todoId,
    },
    data: {
      ...(props.body.title !== undefined && { title: props.body.title }),
      ...(props.body.completed !== undefined && {
        completed: props.body.completed,
      }),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated todo item
  return {
    id: updatedTodo.id,
    todo_list_user_id: updatedTodo.todo_list_user_id,
    title: updatedTodo.title,
    description: updatedTodo.description ?? undefined,
    completed: updatedTodo.completed,
    created_at: toISOStringSafe(updatedTodo.created_at),
    updated_at: toISOStringSafe(updatedTodo.updated_at),
    deleted_at: updatedTodo.deleted_at
      ? toISOStringSafe(updatedTodo.deleted_at)
      : undefined,
  };
}
