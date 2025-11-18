import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppMemberUserChangePassword } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserChangePassword";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function putAuthMemberUserPassword(props: {
  memberUser: MemberuserPayload;
  body: ITodoAppMemberUserChangePassword.IRequest;
}): Promise<ITodoAppMemberUserChangePassword.IResponse> {
  const { memberUser, body } = props;

  // Step 1: Load current member user
  const existingUser = await MyGlobal.prisma.todo_app_memberusers.findUnique({
    where: { id: memberUser.id },
  });

  if (existingUser === null) {
    throw new HttpException("Member user not found", 404);
  }

  // Step 2: Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.currentPassword,
    existingUser.password_hash,
  );

  if (!isCurrentPasswordValid) {
    // Increment failed_login_count on incorrect current password
    await MyGlobal.prisma.todo_app_memberusers.update({
      where: { id: memberUser.id },
      data: {
        failed_login_count: existingUser.failed_login_count + 1,
      },
    });

    throw new HttpException("Current password is incorrect", 400);
  }

  // Step 3: Enforce password complexity rules.
  // Business rule: at least 8 characters, includes letters and digits.
  const newPassword = body.newPassword;

  const hasMinimumLength = newPassword.length >= 8;
  const hasLetter = /[A-Za-z]/.test(newPassword);
  const hasDigit = /[0-9]/.test(newPassword);

  if (!hasMinimumLength || !hasLetter || !hasDigit) {
    throw new HttpException(
      "New password does not meet complexity requirements.",
      400,
    );
  }

  // Step 4: Hash the new password
  const newPasswordHash = await PasswordUtil.hash(newPassword);

  // Step 5: Compute current timestamp string for auditing/session expiry.
  const now = toISOStringSafe(new Date());

  // Step 6: Transactionally update user credentials and expire sessions
  await MyGlobal.prisma.$transaction([
    // Update member user record
    MyGlobal.prisma.todo_app_memberusers.update({
      where: { id: memberUser.id },
      data: {
        password_hash: newPasswordHash,
        failed_login_count: 0,
        updated_at: now,
        last_login_at: now,
      },
    }),

    // Expire all active sessions for this member user, including current one
    MyGlobal.prisma.todo_app_memberuser_sessions.updateMany({
      where: {
        todo_app_memberuser_id: memberUser.id,
        expired_at: null,
      },
      data: {
        expired_at: now,
      },
    }),
  ]);

  const response: ITodoAppMemberUserChangePassword.IResponse = {
    success: true,
    message:
      "Password has been updated successfully. All active sessions have been expired.",
  };

  return response;
}
