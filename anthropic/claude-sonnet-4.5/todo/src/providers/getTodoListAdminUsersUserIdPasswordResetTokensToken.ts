import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordResetToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordResetToken";
import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoListAdminUsersUserIdPasswordResetTokensToken(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  token: string;
}): Promise<ITodoListPasswordResetToken> {
  const record =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findFirst({
      where: {
        todo_list_user_id: props.userId,
        token: props.token,
      },
      include: {
        user: true,
      },
    });
  if (!record) {
    throw new HttpException(
      "Password reset token not found for the specified user.",
      404,
    );
  }
  const user = record.user;
  const result: ITodoListPasswordResetToken = {
    id: record.id,
    token: record.token,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      disabled_at: user.disabled_at
        ? toISOStringSafe(user.disabled_at)
        : undefined,
    },
    created_at: toISOStringSafe(record.created_at),
    expires_at: toISOStringSafe(record.expires_at),
    used_at:
      typeof record.used_at === "undefined" || record.used_at === null
        ? undefined
        : toISOStringSafe(record.used_at),
  };
  return result;
}
