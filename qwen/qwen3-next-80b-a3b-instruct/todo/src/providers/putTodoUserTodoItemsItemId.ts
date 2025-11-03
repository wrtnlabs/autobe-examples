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

export async function putTodoUserTodoItemsItemId(props: {
  user: UserPayload;
  itemId: string;
  body: ITodoItem.IUpdate;
}): Promise<ITodoItem> {
  // Validate that the todo item exists and belongs to the authenticated user
  const todoItem = await MyGlobal.prisma.todo_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      todo_user_id: props.user.id,
      deleted_at: null,
    },
  });

  // Update only the text field, preserving all other properties
  const updatedItem = await MyGlobal.prisma.todo_items.update({
    where: {
      id: props.itemId,
      todo_user_id: props.user.id,
      deleted_at: null,
    },
    data: {
      text: props.body.text,
      // Preserve timestamps
      // Do NOT modify status or completed_at
      // Do NOT touch any other fields
    },
    select: {
      id: true,
      todo_user_id: true,
      text: true,
      status: true,
      created_at: true,
      completed_at: true,
      deleted_at: true,
    },
  });

  // Return the updated item with full metadata
  return typia.assert<ITodoItem>({
    id: updatedItem.id,
    todo_user_id: updatedItem.todo_user_id,
    text: updatedItem.text,
    status: updatedItem.status,
    created_at: toISOStringSafe(updatedItem.created_at),
    completed_at:
      updatedItem.completed_at !== null
        ? toISOStringSafe(updatedItem.completed_at)
        : null,
    deleted_at:
      updatedItem.deleted_at !== null
        ? toISOStringSafe(updatedItem.deleted_at)
        : null,
  });
}
