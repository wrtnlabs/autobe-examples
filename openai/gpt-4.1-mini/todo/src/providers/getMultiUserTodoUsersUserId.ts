import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getMultiUserTodoUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IMultiUserTodoUser.IUser> {
  const user = await MyGlobal.prisma.multi_user_todo_users.findUnique({
    where: { id: props.userId },
    select: {
      id: true,
      email: true,
      display_name: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!user) {
    throw new HttpException("User not found", 404);
  }
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null ? null : toISOStringSafe(user.deleted_at),
  };
}
