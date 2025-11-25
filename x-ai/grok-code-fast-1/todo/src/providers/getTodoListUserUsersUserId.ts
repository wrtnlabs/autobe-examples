import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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
  // Enforce strict self-access: a user may only access their own info
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You are not allowed to access this user’s information.",
      403,
    );
  }
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });
  if (!user) {
    throw new HttpException("User not found.", 404);
  }
  return {
    id: user.id,
    email: user.email,
    display_name: user.display_name,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at:
      user.deleted_at === null || user.deleted_at === undefined
        ? undefined
        : toISOStringSafe(user.deleted_at),
  };
}
