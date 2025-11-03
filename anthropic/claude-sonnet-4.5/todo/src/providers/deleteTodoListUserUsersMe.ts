import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { UserPayload } from "../decorators/payload/UserPayload";

export async function deleteTodoListUserUsersMe(props: {
  user: UserPayload;
}): Promise<void> {
  const { user } = props;

  const existingUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: user.id },
  });

  if (!existingUser) {
    throw new HttpException("User account not found", 404);
  }

  if (existingUser.deleted_at !== null) {
    throw new HttpException("User account already deleted", 400);
  }

  await MyGlobal.prisma.todo_list_users.update({
    where: { id: user.id },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
