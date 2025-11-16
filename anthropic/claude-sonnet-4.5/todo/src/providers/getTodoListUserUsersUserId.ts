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
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own profile",
      403,
    );
  }

  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: {
      id: props.userId,
    },
  });

  if (!user) {
    throw new HttpException("User not found", 404);
  }

  if (user.deleted_at !== null) {
    throw new HttpException("User account has been deleted", 404);
  }

  return {
    id: user.id,
    email: user.email,
    email_verified: user.email_verified,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : null,
  };
}
