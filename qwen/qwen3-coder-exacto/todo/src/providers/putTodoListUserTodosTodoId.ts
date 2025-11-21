import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUserTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListUserTodo.IUpdate;
}): Promise<ITodoListUserTodo> {
  // Verify the todo item exists and belongs to the authenticated user
  const existingTodo = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: {
      id: props.todoId,
      todo_list_user_id: props.user.id,
      deleted_at: null,
    },
  });

  if (!existingTodo) {
    throw new HttpException("Todo item not found or access denied", 404);
  }

  // Perform the update operation with inline parameters
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

  // Return the updated todo item with proper type conversions
  return {
    id: updatedTodo.id,
    todo_list_user_id: updatedTodo.todo_list_user_id,
    title: updatedTodo.title,
    description:
      updatedTodo.description === null ? undefined : updatedTodo.description,
    completed: updatedTodo.completed,
    created_at: toISOStringSafe(updatedTodo.created_at),
    updated_at: toISOStringSafe(updatedTodo.updated_at),
    deleted_at:
      updatedTodo.deleted_at === null
        ? undefined
        : toISOStringSafe(updatedTodo.deleted_at),
  };
}
