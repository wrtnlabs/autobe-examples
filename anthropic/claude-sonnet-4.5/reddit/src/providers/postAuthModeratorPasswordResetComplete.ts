import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";

export async function postAuthModeratorPasswordResetComplete(props: {
  body: IRedditLikeModerator.IPasswordResetComplete;
}): Promise<IRedditLikeModerator.IPasswordResetConfirmation> {
  const { body } = props;

  // Validate password confirmation matches
  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException("Password confirmation does not match", 400);
  }

  const now = toISOStringSafe(new Date());

  // Find reset token record
  const resetRecord =
    await MyGlobal.prisma.reddit_like_password_resets.findFirst({
      where: {
        reset_token: body.reset_token,
      },
    });

  if (!resetRecord) {
    throw new HttpException("Invalid or expired password reset token", 404);
  }

  // Check if token already used
  if (resetRecord.used_at !== null) {
    throw new HttpException(
      "This password reset token has already been used",
      400,
    );
  }

  // Check if token expired
  const currentDate = new Date();
  const expiresDate = new Date(resetRecord.expires_at);
  if (expiresDate < currentDate) {
    throw new HttpException(
      "This password reset link has expired. Please request a new password reset",
      400,
    );
  }

  // Find moderator user in unified user table
  const user = await MyGlobal.prisma.reddit_like_users.findFirst({
    where: {
      email: resetRecord.email,
      role: "moderator",
    },
  });

  if (!user) {
    throw new HttpException("Moderator account not found", 404);
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update user password in unified user table
  await MyGlobal.prisma.reddit_like_users.update({
    where: { id: user.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Mark reset token as used
  await MyGlobal.prisma.reddit_like_password_resets.update({
    where: { id: resetRecord.id },
    data: {
      used_at: now,
    },
  });

  // Invalidate all existing sessions for this user
  await MyGlobal.prisma.reddit_like_sessions.updateMany({
    where: {
      reddit_like_user_id: user.id,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });

  return {
    success: true,
    message:
      "Password has been successfully reset. Please log in with your new password.",
  };
}
