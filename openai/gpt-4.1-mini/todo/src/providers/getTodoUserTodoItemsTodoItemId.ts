import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoItem";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<ITodoItem> {
  const { user, todoItemId } = props;

  const todoItem = await MyGlobal.prisma.todo_todo_items.findFirstOrThrow({
    where: {
      id: todoItemId,
      todo_user_id: user.id,
      deleted_at: null,
    },
  });

  return {
    id: todoItem.id,
    description: todoItem.description,
    status: todoItem.status === "pending" ? "pending" : "completed",
    due_date: todoItem.due_date ? toISOStringSafe(todoItem.due_date) : null,
    created_at: toISOStringSafe(todoItem.created_at),
    updated_at: toISOStringSafe(todoItem.updated_at),
  };
}
