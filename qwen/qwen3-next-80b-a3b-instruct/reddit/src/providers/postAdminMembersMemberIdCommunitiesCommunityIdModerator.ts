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

export async function postAdminMembersMemberIdCommunitiesCommunityIdModerator(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformAdmin.IEmpty;
}): Promise<ICommunityPlatformAdmin.IModeratorAssignment> {
  const { admin, memberId, communityId } = props;

  // Validate admin exists
  const adminRecord = await MyGlobal.prisma.community_platform_admin.findUnique(
    {
      where: { member_id: admin.id },
    },
  );
  if (!adminRecord) {
    throw new HttpException("Unauthorized: Admin not found", 403);
  }

  // Validate member exists and is active (not deleted)
  const memberRecord =
    await MyGlobal.prisma.community_platform_member.findUnique({
      where: { id: memberId, deleted_at: null },
    });
  if (!memberRecord) {
    throw new HttpException("Not Found: Member not found or inactive", 404);
  }

  // Validate community exists
  const communityRecord =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: communityId },
    });
  if (!communityRecord) {
    throw new HttpException("Not Found: Community not found", 404);
  }

  // Check if moderator assignment already exists
  const existingAssignment =
    await MyGlobal.prisma.community_platform_moderator.findUnique({
      where: {
        member_id_community_id: {
          member_id: memberId,
          community_id: communityId,
        },
      },
    });
  if (existingAssignment) {
    throw new HttpException(
      "Conflict: Member already moderator of this community",
      409,
    );
  }

  // Create moderator assignment
  const newAssignment =
    await MyGlobal.prisma.community_platform_moderator.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: memberId,
        community_id: communityId,
        created_at: toISOStringSafe(new Date()),
      },
    });

  // Create audit log
  const category =
    await MyGlobal.prisma.community_platform_report_categories.findFirst({
      where: { name: "moderator_assigned" },
    });
  if (!category) {
    throw new HttpException(
      "Internal Server Error: Audit category not configured",
      500,
    );
  }

  await MyGlobal.prisma.community_platform_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      actor_user_id: admin.id,
      target_user_id: memberId,
      target_community_id: communityId,
      action_type_id: category.id,
      action_description: "Admin assigned moderator role",
      ip_address: "unknown",
      user_agent: "unknown",
      is_system_action: false,
      created_at: toISOStringSafe(new Date()),
    },
  });

  return {
    communityId: newAssignment.community_id,
    memberId: newAssignment.member_id,
    assignedAt: toISOStringSafe(newAssignment.created_at),
  } satisfies ICommunityPlatformAdmin.IModeratorAssignment;
}
