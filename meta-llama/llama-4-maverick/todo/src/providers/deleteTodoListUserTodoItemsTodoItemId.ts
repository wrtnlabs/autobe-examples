import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoItemId } = props;

  // Verify that the Todo item exists and belongs to the user
  const todoItem = await MyGlobal.prisma.todo_list_todo_items
    .findUniqueOrThrow({
      where: { id: todoItemId satisfies string as string },
    })
    .catch((error) => {
      if (error.code === "P404") {
        throw new HttpException("Todo item not found", 404);
      }
      throw error;
    });

  if (todoItem.user_id !== user.id) {
    throw new HttpException(
      "Forbidden: You can only delete your own Todo items",
      403,
    );
  }

  // Delete the Todo item
  await MyGlobal.prisma.todo_list_todo_items.delete({
    where: { id: todoItemId satisfies string as string },
  });
}
