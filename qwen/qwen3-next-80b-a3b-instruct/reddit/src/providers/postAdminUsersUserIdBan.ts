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

export async function postAdminUsersUserIdBan(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IBanReason;
}): Promise<ICommunityPlatformAdmin.IUserBanStatus> {
  // Ensure admin account exists and is valid
  const adminRecord = await MyGlobal.prisma.community_platform_admin.findFirst({
    where: {
      member_id: props.admin.id,
      member: {
        deleted_at: null, // Ensure admin account is active
      },
    },
  });

  if (!adminRecord) {
    throw new HttpException("Admin account not found or inactive", 404);
  }

  // Find target user
  const user = await MyGlobal.prisma.community_platform_member.findFirst({
    where: {
      id: props.userId,
      deleted_at: null, // Only allow banning active users
    },
  });

  if (!user) {
    throw new HttpException("User not found or already banned", 404);
  }

  // Get current timestamp
  const bannedAt = toISOStringSafe(new Date());

  // Update user: soft delete by setting deleted_at
  await MyGlobal.prisma.community_platform_member.update({
    where: { id: props.userId },
    data: {
      deleted_at: bannedAt,
    },
  });

  // Invalidate all active sessions for this user
  await MyGlobal.prisma.community_platform_user_sessions.updateMany({
    where: {
      member_id: props.userId,
      is_active: true,
    },
    data: {
      is_active: false,
    },
  });

  // Find or create audit action type for 'system' category
  const auditCategory =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: { name: "system", is_active: true },
    });

  // Use fallback if no system category exists
  const categoryId =
    auditCategory?.id || "00000000-0000-0000-0000-000000000000";

  // Prepare audit description with optional reason
  const reasonText = props.body.reason
    ? `: ${props.body.reason.substring(0, 1000)}`
    : "";
  const actionDescription = `Admin banned user${reasonText}`;

  // Log audit record
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_user_id: props.admin.id,
      target_user_id: props.userId,
      action_type_id: categoryId,
      action_description: actionDescription,
      ip_address: "system",
      user_agent: "system",
      created_at: bannedAt,
      is_system_action: false,
    },
  });

  return {
    userId: props.userId,
    bannedAt,
    isPermanentlyBanned: true,
  };
}
