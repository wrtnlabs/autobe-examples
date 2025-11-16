import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserTodoListUsersId(props: {
  user: UserPayload;
  id: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.id },
  });

  if (!existing) {
    throw new HttpException("todoListUser not found", 404);
  }

  await MyGlobal.prisma.todo_list_users.delete({
    where: { id: props.id },
  });
}
