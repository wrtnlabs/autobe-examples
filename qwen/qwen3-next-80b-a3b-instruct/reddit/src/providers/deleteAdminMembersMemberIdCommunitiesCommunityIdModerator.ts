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

export async function deleteAdminMembersMemberIdCommunitiesCommunityIdModerator(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IEmpty;
}): Promise<ICommunityPlatformAdmin.IModeratorRevocation> {
  const { admin, memberId, communityId } = props;

  // Validate that admin is actually an admin
  const adminRecord = await MyGlobal.prisma.community_platform_admin.findFirst({
    where: {
      member_id: admin.id,
    },
  });

  if (!adminRecord) {
    throw new HttpException("Admin not found", 404);
  }

  // Verify the target user has moderator privileges
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_moderator.findFirst({
      where: {
        member_id: memberId,
        community_id: communityId,
      },
    });

  if (!moderatorRecord) {
    throw new HttpException(
      "Moderator not found for this member and community",
      404,
    );
  }

  // Get the report category for "moderation_action" to use as audit log action type
  const moderationCategory =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: {
        name: "moderation_action",
        is_active: true,
      },
    });

  if (!moderationCategory) {
    // Fallback: Create a local DNS-simulated UUID if category not found
    const fallbackCategoryId = v4() as string & tags.Format<"uuid">;

    // Create audit log with fallback
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_user_id: admin.id,
        target_user_id: memberId,
        target_community_id: communityId,
        action_type_id: fallbackCategoryId,
        action_description: "Admin revoked moderator role",
        ip_address: "127.0.0.1",
        user_agent: "system",
        created_at: toISOStringSafe(new Date()),
        is_system_action: false,
      },
    });
  } else {
    // Create audit log with proper category ID
    await MyGlobal.prisma.community_platform_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_user_id: admin.id,
        target_user_id: memberId,
        target_community_id: communityId,
        action_type_id: moderationCategory.id,
        action_description: "Admin revoked moderator role",
        ip_address: "127.0.0.1",
        user_agent: "system",
        created_at: toISOStringSafe(new Date()),
        is_system_action: false,
      },
    });
  }

  // Delete the moderator record
  await MyGlobal.prisma.community_platform_moderator.delete({
    where: {
      id: moderatorRecord.id,
    },
  });

  // Return the response with current timestamp as revokedAt
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  return {
    communityId,
    memberId,
    revokedAt: now,
  };
}
