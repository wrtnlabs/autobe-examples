import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodouserPayload } from "../decorators/payload/TodouserPayload";

export async function deleteTodoListTodoUserTodoUsersTodoUserId(props: {
  todoUser: TodouserPayload;
  todoUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Authorization: Only the authenticated user may delete their own account
  if (props.todoUser.id !== props.todoUserId) {
    throw new HttpException(
      "Forbidden: You can only delete your own account.",
      403,
    );
  }

  await MyGlobal.prisma.todo_list_todousers.delete({
    where: { id: props.todoUserId },
  });
}
