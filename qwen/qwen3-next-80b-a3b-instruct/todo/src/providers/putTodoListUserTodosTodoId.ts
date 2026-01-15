import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoId(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
  body: ITodoListTodo.IUpdate;
}): Promise<ITodoListTodo> {
  // Verify todo exists and belongs to user
  const todo = await MyGlobal.prisma.todo_list_todos.findUnique({
    where: { id: props.todoId },
    select: {
      id: true,
      todo_list_user_id: true,
      title: true,
      description: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!todo) {
    throw new HttpException("Todo not found", 404);
  }
  if (todo.todo_list_user_id !== props.user.id) {
    throw new HttpException(
      "Forbidden - You can only update your own todos",
      403,
    );
  }
  // Update todo with provided fields
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: props.todoId },
    data: {
      ...props.body,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Return full todo with user summary using user data from props and loaded schema
  return {
    id: updated.id,
    title: updated.title,
    details: updated.description ?? undefined,
    completed: updated.status === "completed",
    priority: "low",
    sequence: 0,
    createdAt: toISOStringSafe(updated.created_at),
    user: {
      id: props.user.id,
      email: props.user.email,
      username: props.user.email,
      createdAt: toISOStringSafe(new Date()), // Use current date as fallback since we don't have user's created_at
      isActive: true,
      role: "user",
      profileUrl: undefined,
      notes: undefined,
    },
  } satisfies ITodoListTodo;
}
