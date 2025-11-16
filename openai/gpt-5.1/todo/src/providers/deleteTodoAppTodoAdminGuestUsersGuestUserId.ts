import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function deleteTodoAppTodoAdminGuestUsersGuestUserId(props: {
  todoAdmin: TodoadminPayload;
  guestUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  const existing = await MyGlobal.prisma.todo_app_guestusers.findUnique({
    where: { id: props.guestUserId },
  });

  if (existing === null) {
    throw new HttpException("Guest user not found", 404);
  }

  await MyGlobal.prisma.todo_app_guestusers.delete({
    where: { id: props.guestUserId },
  });
}
