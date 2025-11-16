import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function getTodoListUserUsersUserIdPasswordResetsResetId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  resetId: string & tags.Format<"uuid">;
}): Promise<ITodoListPasswordReset> {
  if (props.userId !== props.user.id) {
    throw new HttpException(
      "Forbidden: You can only access your own password reset requests",
      403,
    );
  }

  const passwordReset =
    await MyGlobal.prisma.todo_list_password_resets.findUnique({
      where: { id: props.resetId },
    });

  if (!passwordReset) {
    throw new HttpException("Password reset request not found", 404);
  }

  if (passwordReset.todo_list_user_id !== props.userId) {
    throw new HttpException(
      "Forbidden: This password reset request belongs to a different user",
      403,
    );
  }

  return {
    id: passwordReset.id,
    todo_list_user_id: passwordReset.todo_list_user_id,
    token: passwordReset.token,
    used: passwordReset.used,
    created_at: toISOStringSafe(passwordReset.created_at),
    expires_at: toISOStringSafe(passwordReset.expires_at),
  };
}
