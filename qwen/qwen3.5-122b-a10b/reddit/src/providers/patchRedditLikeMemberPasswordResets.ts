import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberPasswordResets(props: {
  member: MemberPayload;
  body: IRedditLikeMemberPasswordReset.IRequest;
}): Promise<IRedditLikeMemberPasswordReset.IResponse> {
  // Validate password is provided and not empty
  if (!props.body.password || props.body.password.trim().length === 0) {
    throw new HttpException("Password is required", 400);
  }
  // Find password reset record by token (not soft-deleted)
  const passwordReset =
    await MyGlobal.prisma.reddit_like_member_password_resets.findUnique({
      where: {
        token: props.body.token,
        deleted_at: null,
      },
    });
  // Token not found or already used
  if (passwordReset === null) {
    throw new HttpException("Invalid or expired reset token", 401);
  }
  // Validate token not expired - Prisma returns Date objects for DateTime fields
  const now = new Date();
  if (passwordReset.expires_at <= now) {
    throw new HttpException("Reset token has expired", 401);
  }
  // Verify token belongs to authenticated member
  if (passwordReset.reddit_like_member_id !== props.member.id) {
    throw new HttpException("Invalid reset token for this member", 401);
  }
  // Hash the new password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // Update member's password
  await MyGlobal.prisma.reddit_like_members.update({
    where: { id: props.member.id },
    data: {
      password_hash: passwordHash,
      updated_at: now,
    },
  });
  // Soft-delete the password reset record
  await MyGlobal.prisma.reddit_like_member_password_resets.update({
    where: { id: passwordReset.id },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  return {
    success: true,
    message:
      "Password has been successfully reset. You can now log in with your new password.",
  };
}
