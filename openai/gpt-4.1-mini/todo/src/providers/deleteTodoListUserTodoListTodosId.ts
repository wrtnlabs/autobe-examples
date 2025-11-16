import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListTodosId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const found = await MyGlobal.prisma.todo_list_todos.findFirst({
    where: { id: props.id, user_id: props.user.id },
  });

  if (found === null) {
    throw new HttpException("Todo item not found", 404);
  }

  await MyGlobal.prisma.todo_list_todos.delete({
    where: { id: props.id },
  });
}
