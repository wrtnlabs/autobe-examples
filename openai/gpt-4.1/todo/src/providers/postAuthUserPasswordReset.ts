import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function postAuthUserPasswordReset(props: {
  body: ITodoListUser.IResetPassword;
}): Promise<ITodoListUser.IResetPasswordResult> {
  const nowIso = toISOStringSafe(new Date());
  // 1. Find user by reset_password_token (must be set, not null, not already used), and visible (not deleted)
  const user = await MyGlobal.prisma.todo_list_users.findFirst({
    where: {
      reset_password_token: props.body.reset_password_token,
      deleted_at: null,
    },
  });
  // Always generic message on failure (no info leak)
  const genericFailMsg =
    "Password reset failed. Please try again or request a new password reset.";
  if (!user || !user.reset_password_token || !user.reset_password_sent_at) {
    return {
      is_success: false,
      message: genericFailMsg,
    };
  }
  // 2. Ensure reset token has not expired: reset_password_sent_at must be within 1 hour
  // (Defines policy that tokens expire in 1 hour)
  const sentAt = new Date(user.reset_password_sent_at);
  const oneHourMs = 60 * 60 * 1000;
  if (new Date().getTime() - sentAt.getTime() > oneHourMs) {
    return {
      is_success: false,
      message: genericFailMsg,
    };
  }
  // 3. Password policy: already validated by DTO, but recheck for defense in depth
  const pw = props.body.password;
  if (
    pw.length < 8 ||
    pw.length > 128 ||
    !(/[A-Za-z]/.test(pw) && /\d/.test(pw))
  ) {
    return {
      is_success: false,
      message: genericFailMsg,
    };
  }
  // 4. Securely hash new password
  const newHash = await PasswordUtil.hash(pw);
  // 5. Begin transaction: update password (clear token, mark updated), revoke all sessions
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.todo_list_users.update({
      where: { id: user.id },
      data: {
        password_hash: newHash,
        reset_password_token: null,
        reset_password_sent_at: null,
        updated_at: nowIso,
      },
    }),
    MyGlobal.prisma.todo_list_user_sessions.updateMany({
      where: { todo_list_user_id: user.id, expired_at: null },
      data: { expired_at: nowIso },
    }),
  ]);
  // 6. Success response (generic message)
  return {
    is_success: true,
    message:
      "Your password has been reset successfully. Please log in with your new password.",
  };
}
