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
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserIdPasswordResetTokensToken(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  token: string;
}): Promise<ITodoListPasswordResetToken> {
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You may only view your own password reset tokens.",
      403,
    );
  }

  const resetToken =
    await MyGlobal.prisma.todo_list_password_reset_tokens.findFirst({
      where: {
        todo_list_user_id: props.userId,
        token: props.token,
      },
    });

  if (!resetToken) {
    throw new HttpException(
      "Password reset token not found for this user.",
      404,
    );
  }

  const user = await MyGlobal.prisma.todo_list_users.findUnique({
    where: { id: props.userId },
  });

  if (!user) {
    throw new HttpException(
      "User not found for this password reset token.",
      404,
    );
  }

  return {
    id: resetToken.id,
    token: resetToken.token,
    user: {
      id: user.id,
      email: user.email,
      created_at: toISOStringSafe(user.created_at),
      updated_at: toISOStringSafe(user.updated_at),
      disabled_at:
        user.disabled_at !== null && user.disabled_at !== undefined
          ? toISOStringSafe(user.disabled_at)
          : undefined,
    },
    created_at: toISOStringSafe(resetToken.created_at),
    expires_at: toISOStringSafe(resetToken.expires_at),
    used_at:
      resetToken.used_at !== null && resetToken.used_at !== undefined
        ? toISOStringSafe(resetToken.used_at)
        : undefined,
  };
}
