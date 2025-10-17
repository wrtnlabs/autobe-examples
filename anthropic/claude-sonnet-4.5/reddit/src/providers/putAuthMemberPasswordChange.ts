import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putAuthMemberPasswordChange(props: {
  member: MemberPayload;
  body: IRedditLikeMember.IChangePassword;
}): Promise<IRedditLikeMember.IPasswordChanged> {
  const { member, body } = props;

  // Validate new password confirmation matches
  if (body.new_password !== body.new_password_confirmation) {
    throw new HttpException("New password and confirmation do not match", 400);
  }

  // Validate new password complexity requirements
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%&*]).{8,}$/;
  if (!passwordRegex.test(body.new_password)) {
    throw new HttpException(
      "New password must be at least 8 characters with uppercase, lowercase, number, and special character",
      400,
    );
  }

  // Fetch user record from unified reddit_like_users table
  const userRecord = await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: { id: member.id },
    select: {
      id: true,
      password_hash: true,
      deleted_at: true,
      role: true,
    },
  });

  // Check if user account is deleted
  if (userRecord.deleted_at !== null) {
    throw new HttpException("Account is no longer active", 403);
  }

  // Verify this is a member account
  if (userRecord.role !== "member") {
    throw new HttpException("Invalid account type for this operation", 403);
  }

  // Verify password_hash exists
  if (!userRecord.password_hash) {
    throw new HttpException("Account has no password set", 400);
  }

  // Verify current password
  const isCurrentPasswordValid = await PasswordUtil.verify(
    body.current_password,
    userRecord.password_hash,
  );

  if (!isCurrentPasswordValid) {
    throw new HttpException("Current password is incorrect", 401);
  }

  // Hash new password
  const newPasswordHash = await PasswordUtil.hash(body.new_password);

  // Update password_hash and updated_at timestamp
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.reddit_like_users.update({
    where: { id: member.id },
    data: {
      password_hash: newPasswordHash,
      updated_at: now,
    },
  });

  // Invalidate all sessions for this user by setting deleted_at
  await MyGlobal.prisma.reddit_like_sessions.updateMany({
    where: {
      reddit_like_user_id: member.id,
      deleted_at: null,
    },
    data: {
      deleted_at: now,
    },
  });

  return {
    success: true,
    message:
      "Your password has been successfully changed. All other sessions have been invalidated.",
  };
}
