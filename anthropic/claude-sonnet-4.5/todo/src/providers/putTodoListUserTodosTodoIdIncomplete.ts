import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListTodo } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTodo";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function putTodoListUserTodosTodoIdIncomplete(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const { user, todoId } = props;

  // Fetch the todo item to verify existence and check ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findUniqueOrThrow({
    where: { id: todoId },
  });

  // Verify ownership - users can only modify their own todo items
  if (todo.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only modify your own todo items",
      403,
    );
  }

  // Update the todo status to incomplete and refresh updated_at timestamp
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todoId },
    data: {
      status: "incomplete",
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Return the updated todo with proper type conversions
  return {
    id: updated.id as string & tags.Format<"uuid">,
    todo_list_user_id: updated.todo_list_user_id as string &
      tags.Format<"uuid">,
    title: updated.title,
    description: updated.description ?? undefined,
    status: updated.status as "complete" | "incomplete",
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
