import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoUserTodoItemsTodoItemId(props: {
  user: UserPayload;
  todoItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { user, todoItemId } = props;

  const todoItem = await MyGlobal.prisma.todo_todo_items.findUniqueOrThrow({
    where: { id: todoItemId },
  });

  if (todoItem.todo_user_id !== user.id) {
    throw new HttpException(
      "Unauthorized: You can only delete your own todo items",
      403,
    );
  }

  await MyGlobal.prisma.todo_todo_items.delete({
    where: { id: todoItemId },
  });
}
