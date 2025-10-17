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

export async function postAdminUsersUserIdUnban(props: {
  admin: AdminPayload;
  userId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IUnbanReason;
}): Promise<ICommunityPlatformAdmin.IUserUnbanStatus> {
  const { admin, userId, body } = props;

  // Check if user exists and is banned (deleted_at exists)
  const user =
    await MyGlobal.prisma.community_platform_member.findUniqueOrThrow({
      where: { id: userId },
    });

  if (user.deleted_at === null) {
    throw new HttpException("User is not banned", 404);
  }

  // Find the audit log category for unban action
  const unbanCategory =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: { name: "unban", is_active: true },
    });

  if (!unbanCategory) {
    throw new HttpException("Unban audit category not configured", 500);
  }

  // Unban user: set deleted_at to null
  const updatedUser = await MyGlobal.prisma.community_platform_member.update({
    where: { id: userId },
    data: {
      deleted_at: null,
    },
  });

  // Reactivate all user sessions
  await MyGlobal.prisma.community_platform_user_sessions.updateMany({
    where: { member_id: userId, is_active: false },
    data: {
      is_active: true,
    },
  });

  // Create audit log entry
  const now = toISOStringSafe(new Date());
  const auditLogId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: auditLogId,
      actor_user_id: admin.id,
      target_user_id: userId,
      action_type_id: unbanCategory.id,
      action_description: "Admin unbanned user",
      ip_address: "system",
      user_agent: "system",
      created_at: now,
      is_system_action: false,
    },
  });

  return {
    userId: updatedUser.id,
    unbannedAt: now,
    status: "unbanned",
  };
}
