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
  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId, deleted_at: null },
  });
  if (!user) throw new HttpException("User not found", 404);
  return {
    id: user.id,
    email: user.email,
    is_verified: user.is_verified,
    locked: user.locked,
    locked_at: user.locked_at ? toISOStringSafe(user.locked_at) : undefined,
    email_verification_token: user.email_verification_token ?? undefined,
    email_verification_sent_at: user.email_verification_sent_at
      ? toISOStringSafe(user.email_verification_sent_at)
      : undefined,
    reset_password_token: user.reset_password_token ?? undefined,
    reset_password_sent_at: user.reset_password_sent_at
      ? toISOStringSafe(user.reset_password_sent_at)
      : undefined,
    created_at: toISOStringSafe(user.created_at),
    updated_at: toISOStringSafe(user.updated_at),
    deleted_at: user.deleted_at ? toISOStringSafe(user.deleted_at) : undefined,
  };
}
