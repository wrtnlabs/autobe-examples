import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";

export async function postAuthAdminPasswordResetComplete(props: {
  body: IRedditLikeAdmin.IPasswordResetComplete;
}): Promise<IRedditLikeAdmin.IPasswordResetCompleteResponse> {
  const { body } = props;

  // Validate password confirmation matches
  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException("Password confirmation does not match", 400);
  }

  // Find the password reset record by token
  const resetRecord =
    await MyGlobal.prisma.reddit_like_password_resets.findFirst({
      where: {
        reset_token: body.reset_token,
      },
    });

  if (!resetRecord) {
    throw new HttpException("Invalid or expired reset token", 400);
  }

  // Check if token has expired (1 hour validity)
  const currentTime = new Date();
  if (resetRecord.expires_at < currentTime) {
    throw new HttpException(
      "This password reset link has expired. Please request a new password reset.",
      400,
    );
  }

  // Check if token has already been used
  if (resetRecord.used_at !== null) {
    throw new HttpException(
      "This password reset link has already been used and is no longer valid",
      400,
    );
  }

  // Get the user record
  const user = await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: {
      id: resetRecord.reddit_like_user_id,
    },
  });

  // Validate user is an admin
  if (user.role !== "admin") {
    throw new HttpException(
      "This password reset is only for administrator accounts",
      403,
    );
  }

  // Hash the new password
  const hashedPassword = await PasswordUtil.hash(body.new_password);
  const nowTimestamp = toISOStringSafe(new Date());

  // Update user's password
  await MyGlobal.prisma.reddit_like_users.update({
    where: {
      id: user.id,
    },
    data: {
      password_hash: hashedPassword,
      updated_at: nowTimestamp,
    },
  });

  // Mark reset token as used
  await MyGlobal.prisma.reddit_like_password_resets.update({
    where: {
      id: resetRecord.id,
    },
    data: {
      used_at: nowTimestamp,
    },
  });

  // Invalidate all existing sessions for security
  await MyGlobal.prisma.reddit_like_sessions.updateMany({
    where: {
      reddit_like_user_id: user.id,
      deleted_at: null,
    },
    data: {
      deleted_at: nowTimestamp,
    },
  });

  return {
    success: true,
    message:
      "Your password has been successfully reset. Please log in with your new password.",
  };
}
