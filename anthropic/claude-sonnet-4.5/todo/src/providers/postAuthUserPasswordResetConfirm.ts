import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListPasswordReset";

export async function postAuthUserPasswordResetConfirm(props: {
  body: ITodoListPasswordReset.IConfirm;
}): Promise<ITodoListPasswordReset.IConfirmResult> {
  const { token, newPassword } = props.body;

  const resetRecord =
    await MyGlobal.prisma.todo_list_password_resets.findUnique({
      where: { token },
    });

  if (!resetRecord) {
    return {
      success: false,
      message: "Invalid reset token.",
    };
  }

  if (resetRecord.used === true) {
    return {
      success: false,
      message: "This reset token has already been used.",
    };
  }

  const now = new Date();
  if (resetRecord.expires_at < now) {
    return {
      success: false,
      message: "Reset token has expired. Please request a new password reset.",
    };
  }

  const hashedPassword = await PasswordUtil.hash(newPassword);

  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.todo_list_users.update({
      where: { id: resetRecord.todo_list_user_id },
      data: {
        password_hash: hashedPassword,
        updated_at: now,
      },
    });

    await tx.todo_list_password_resets.update({
      where: { id: resetRecord.id },
      data: {
        used: true,
      },
    });

    await tx.todo_list_user_sessions.deleteMany({
      where: { todo_list_user_id: resetRecord.todo_list_user_id },
    });
  });

  return {
    success: true,
    message:
      "Password successfully reset. Please log in with your new password.",
  };
}
