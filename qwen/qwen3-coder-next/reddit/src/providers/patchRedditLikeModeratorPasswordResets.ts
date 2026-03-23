import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditLikeMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMemberPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorPasswordResets(props: {
  moderator: ModeratorPayload;
  body: IRedditLikeMemberPasswordReset.IRequest;
}): Promise<IRedditLikeMemberPasswordReset.IResponse> {
  // Validate email format
  if (
    !props.body.email ||
    typeof props.body.email !== "string" ||
    !props.body.email.includes("@")
  ) {
    throw new HttpException("Invalid email format", 400);
  }
  const email = props.body.email.toLowerCase().trim() as string &
    tags.Format<"email">;
  // Look up member by email
  const member = await MyGlobal.prisma.reddit_like_members.findFirst({
    where: {
      email: email,
      deleted_at: null,
    },
  });
  // For security, return success regardless of email existence
  // However, only create reset token if member exists
  if (member !== null) {
    // Check if there are existing active reset requests (prevent spam)
    const now = new Date();
    const expiredAtGte = toISOStringSafe(now) as string &
      tags.Format<"date-time">;
    const existingReset =
      await MyGlobal.prisma.reddit_like_member_password_resets.findFirst({
        where: {
          member_id: member.id,
          deleted_at: null,
          expired_at: {
            gte: expiredAtGte,
          },
        },
      });
    // If existing reset is still valid, don't create another one
    if (existingReset === null) {
      // Generate secure random token
      const resetToken = v4();
      // Hash the token (in production, use proper password hashing)
      const resetTokenHash = await PasswordUtil.hash(resetToken);
      // Calculate expiration (24 hours from now)
      const expirationDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const expiredAt = toISOStringSafe(expirationDate) as string &
        tags.Format<"date-time">;
      const createdAt = toISOStringSafe(now) as string &
        tags.Format<"date-time">;
      const updatedAt = toISOStringSafe(now) as string &
        tags.Format<"date-time">;
      // Create password reset record
      await MyGlobal.prisma.reddit_like_member_password_resets.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          member_id: member.id as string & tags.Format<"uuid">,
          reset_token: resetTokenHash,
          expired_at: expiredAt,
          created_at: createdAt,
          updated_at: updatedAt,
          deleted_at: null,
        },
      });
      // Send reset email (simulated - in real implementation, send email here)
      // await EmailService.sendPasswordResetEmail(member.email, resetToken);
    }
  }
  return {
    message:
      "Password reset request processed. If the email exists, a reset link has been sent.",
  };
}
