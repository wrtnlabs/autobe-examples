import { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformUserPasswordResetAtResponseTransformer } from "../transformers/CommunityPlatformUserPasswordResetAtResponseTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformUserPasswordResets(props: {
  user: UserPayload;
  body: ICommunityPlatformUserPasswordReset.IRequest;
}): Promise<ICommunityPlatformUserPasswordReset.IResponse> {
  // Step 1: Find user by email across all actor tables
  const user = await MyGlobal.prisma.community_platform_users.findUnique({
    where: { email: props.body.email, deleted_at: null },
    select: { id: true, email: true },
  });
  let targetUserId: (string & tags.Format<"uuid">) | undefined;
  let targetUserEmail: string | undefined;
  if (user) {
    targetUserId = user.id;
    targetUserEmail = user.email;
  } else {
    const moderator =
      await MyGlobal.prisma.community_platform_moderators.findUnique({
        where: { email: props.body.email, deleted_at: null },
        select: { id: true, email: true },
      });
    if (moderator) {
      targetUserId = moderator.id;
      targetUserEmail = moderator.email;
    } else {
      const admin = await MyGlobal.prisma.community_platform_admins.findUnique({
        where: { email: props.body.email, deleted_at: null },
        select: { id: true, email: true },
      });
      if (admin) {
        targetUserId = admin.id;
        targetUserEmail = admin.email;
      }
    }
  }
  if (!targetUserId || !targetUserEmail) {
    throw new HttpException("User not found", 404);
  }
  // Step 2: Generate secure reset token (32+ characters)
  const resetToken = v4() + v4();
  // Step 3: Calculate expiration (1 hour from now) as ISO string
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 60 * 60 * 1000);
  // Step 4: Invalidate previous active tokens
  await MyGlobal.prisma.community_platform_user_password_resets.updateMany({
    where: {
      community_platform_user_id: targetUserId,
      used_at: null,
      expires_at: { gt: now },
    },
    data: { expires_at: now },
  });
  // Step 5: Create new password reset record
  const passwordReset =
    await MyGlobal.prisma.community_platform_user_password_resets.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        community_platform_user_id: targetUserId,
        token: resetToken,
        expires_at: expiresAt,
        used_at: null,
        created_at: now,
        updated_at: now,
      },
      ...CommunityPlatformUserPasswordResetAtResponseTransformer.select(),
    });
  // Step 6: Send email with reset instructions (stub implementation)
  console.log(`Password reset email sent to: ${targetUserEmail}`);
  console.log(`Reset token: ${resetToken}`);
  // In production: await emailService.sendPasswordReset(targetUserEmail, resetToken);
  // Step 7: Transform and return response
  return await CommunityPlatformUserPasswordResetAtResponseTransformer.transform(
    passwordReset,
  );
}
