import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<ITodoListUser> {
  const targetUser = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
    select: {
      email: true,
      id: true,
      username: true,
    },
  });

  if (!targetUser) {
    throw new HttpException("User not found", 404);
  }

  if (targetUser.id !== props.user.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    email: targetUser.email,
    id: targetUser.id,
    name: targetUser.username,
  };
}
