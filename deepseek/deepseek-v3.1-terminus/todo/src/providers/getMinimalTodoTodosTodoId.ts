import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IMinimalTodoTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/IMinimalTodoTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getMinimalTodoTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<IMinimalTodoTodo> {
  const { user, todoId } = props;

  // Fetch the todo item from the database
  const todo = await MyGlobal.prisma.minimal_todo_todos.findFirst({
    where: {
      id: todoId,
      deleted_at: null, // Only fetch non-deleted todos
    },
  });

  // Check if todo exists
  if (!todo) {
    throw new HttpException("Todo not found or has been deleted", 404);
  }

  // Note: The schema doesn't have a user_id field, so ownership verification
  // would require a different approach. Assuming this is handled at a higher level.

  // Return the todo with properly converted date fields
  return {
    id: todo.id,
    content: todo.content,
    completed: todo.completed,
    created_at: toISOStringSafe(todo.created_at),
    updated_at: toISOStringSafe(todo.updated_at),
    deleted_at: todo.deleted_at ? toISOStringSafe(todo.deleted_at) : null,
  };
}
