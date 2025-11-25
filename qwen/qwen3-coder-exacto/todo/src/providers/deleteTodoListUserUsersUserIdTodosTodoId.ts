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

export async function deleteTodoListUserUsersUserIdTodosTodoId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListUserTodo> {
  // Verify that the authenticated user matches the requested userId
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only delete your own todos",
      403,
    );
  }

  // Find the todo item to verify it exists and belongs to the user
  const existingTodo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: {
      id: props.todoId,
      todo_list_user_id: props.userId,
    },
  });

  // If todo doesn't exist or doesn't belong to the user, return 404
  if (!existingTodo) {
    throw new HttpException("Todo item not found", 404);
  }

  // Perform soft delete by setting deleted_at timestamp
  const deletedTodo = await MyGlobal.prisma.todo_list_todos.update({
    where: {
      id: props.todoId,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated todo item with populated deleted_at field
  return {
    id: deletedTodo.id,
    todo_list_user_id: deletedTodo.todo_list_user_id,
    title: deletedTodo.title,
    completed: deletedTodo.completed,
    created_at: toISOStringSafe(deletedTodo.created_at),
    updated_at: toISOStringSafe(deletedTodo.updated_at),
    deleted_at:
      deletedTodo.deleted_at !== null
        ? toISOStringSafe(deletedTodo.deleted_at)
        : undefined,
    ...(deletedTodo.description !== null && {
      description: deletedTodo.description,
    }),
  };
}
