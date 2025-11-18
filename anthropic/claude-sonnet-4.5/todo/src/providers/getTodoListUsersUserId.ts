import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function getTodoListUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: user.id,
    email: user.email,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    disabled_at:
      user.disabled_at === null || user.disabled_at === undefined
        ? undefined
        : toISOStringSafe(user.disabled_at),
  };
}
