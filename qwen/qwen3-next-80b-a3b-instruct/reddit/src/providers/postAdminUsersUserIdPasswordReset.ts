import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postAdminUsersUserIdPasswordReset(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IResetPasswordNote;
}): Promise<ICommunityPlatformAdmin.IPasswordResetInitiated> {
  // Find the target user
  const targetUser =
    await MyGlobal.prisma.community_platform_member.findFirstOrThrow({
      where: {
        id: props.userId,
        deleted_at: null,
      },
    });

  // Find the password reset action type ID from community_platform_report_categories
  const passwordResetActionType =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: {
        name: "password_reset",
        is_active: true,
      },
    });

  if (!passwordResetActionType) {
    throw new HttpException("Password reset action type not configured", 500);
  }

  // Generate a secure reset token
  const resetToken = v4() as string & tags.Format<"uuid">;
  const tokenHash = await PasswordUtil.hash(resetToken);
  const expiresAt = toISOStringSafe(new Date(Date.now() + 15 * 60 * 1000)); // 15 minutes from now
  const requestedAt = toISOStringSafe(new Date());

  // Store the password reset request in database
  await MyGlobal.prisma.community_platform_password_resets.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: props.userId,
      token: resetToken,
      token_hash: tokenHash,
      expires_at: expiresAt,
      requested_at: requestedAt,
      is_used: false,
    },
  });

  // Create audit log entry for admin-initiated password reset
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_user_id: props.admin.id,
      target_user_id: props.userId,
      action_type_id: passwordResetActionType.id,
      action_description: "Admin initiated password reset for user",
      ip_address: "127.0.0.1",
      user_agent: "admin-api",
      created_at: toISOStringSafe(new Date()),
      is_system_action: false,
    },
  });

  // Return success message
  return {
    message:
      "Password reset request has been initiated and notification has been sent.",
  };
}
