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

export async function putTodoListUserTodosTodoIdComplete(props: {
  user: UserPayload;
  todoId: string & tags.Format<"uuid">;
}): Promise<ITodoListTodo> {
  const { user, todoId } = props;

  // Fetch the todo to verify existence and ownership
  const todo = await MyGlobal.prisma.todo_list_todos.findUniqueOrThrow({
    where: { id: todoId },
  });

  // Authorization check: verify user owns this todo
  if (todo.todo_list_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only complete your own todos",
      403,
    );
  }

  // Prepare updated_at timestamp once
  const now = toISOStringSafe(new Date());

  // Update todo status to complete
  const updated = await MyGlobal.prisma.todo_list_todos.update({
    where: { id: todoId },
    data: {
      status: "complete",
      updated_at: now,
    },
  });

  // Return properly formatted response
  return {
    id: updated.id,
    todo_list_user_id: updated.todo_list_user_id,
    title: updated.title,
    description: updated.description ?? undefined,
    status: typia.assert<"complete" | "incomplete">(updated.status),
    created_at: toISOStringSafe(updated.created_at),
    updated_at: now,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
