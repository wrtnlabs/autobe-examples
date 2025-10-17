import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

export async function postAuthMemberPasswordResetComplete(props: {
  body: IRedditLikeMember.IResetPassword;
}): Promise<IRedditLikeMember.IPasswordResetCompleted> {
  const { body } = props;

  // Validate password confirmation matches
  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException("Password confirmation does not match.", 400);
  }

  // Find reset token record
  const resetRecord =
    await MyGlobal.prisma.reddit_like_password_resets.findUnique({
      where: { reset_token: body.reset_token },
    });

  if (!resetRecord) {
    throw new HttpException("Invalid or expired reset token.", 400);
  }

  // Generate current timestamp once for consistency
  const currentTime = new Date();
  const now = toISOStringSafe(currentTime);

  // Check if token is expired
  if (currentTime > resetRecord.expires_at) {
    throw new HttpException(
      "This password reset link has expired. Please request a new password reset.",
      400,
    );
  }

  // Check if token already used
  if (resetRecord.used_at !== null) {
    throw new HttpException(
      "This reset token has already been used. Please request a new password reset if needed.",
      400,
    );
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update member password
  await MyGlobal.prisma.reddit_like_users.update({
    where: { id: resetRecord.reddit_like_user_id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Mark token as used
  await MyGlobal.prisma.reddit_like_password_resets.update({
    where: { id: resetRecord.id },
    data: {
      used_at: now,
    },
  });

  // Invalidate all sessions for this user
  await MyGlobal.prisma.reddit_like_sessions.updateMany({
    where: {
      reddit_like_user_id: resetRecord.reddit_like_user_id,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });

  return {
    success: true,
    message:
      "Your password has been successfully reset. Please log in with your new password.",
  };
}
