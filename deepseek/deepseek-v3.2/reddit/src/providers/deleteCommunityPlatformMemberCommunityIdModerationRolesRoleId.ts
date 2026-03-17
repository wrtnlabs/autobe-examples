import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteCommunityPlatformMemberCommunityIdModerationRolesRoleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId, deleted_at: null },
      select: { id: true, owner_member_id: true },
    });
  // Check if caller has active moderation role in this community
  const callerRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
        role_type: true,
        assigned_by_community_platform_member_id: true,
      },
    });
  if (!callerRole) {
    throw new HttpException(
      "You do not have moderation authority in this community",
      403,
    );
  }
  // Fetch the target role, ensure it exists and is active
  const targetRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findUniqueOrThrow(
      {
        where: { id: props.roleId, deleted_at: null },
        select: {
          id: true,
          role_type: true,
          community_platform_member_id: true,
          community_platform_community_id: true,
          assigned_by_community_platform_member_id: true,
        },
      },
    );
  // Verify target role belongs to the specified community
  if (targetRole.community_platform_community_id !== props.communityId) {
    throw new HttpException(
      "Moderation role does not belong to the specified community",
      404,
    );
  }
  // Business rule: Cannot delete owner roles
  if (targetRole.role_type === "owner") {
    throw new HttpException(
      "Owner roles cannot be removed through this interface",
      400,
    );
  }
  // Ensure target role is a moderator role
  if (targetRole.role_type !== "moderator") {
    throw new HttpException("Invalid role type for deletion", 400);
  }
  // Authorization logic based on caller's role
  const isCallerOwner = callerRole.role_type === "owner";
  const isCallerModerator = callerRole.role_type === "moderator";
  if (isCallerOwner) {
    // Owner can remove any moderator role
    // Additional check: prevent owner from removing themselves if they somehow have a moderator role
    if (targetRole.community_platform_member_id === props.member.id) {
      throw new HttpException(
        "Owner cannot remove their own moderator role assignment",
        400,
      );
    }
  } else if (isCallerModerator) {
    // Moderator can only remove moderator roles they assigned
    if (
      targetRole.assigned_by_community_platform_member_id !== props.member.id
    ) {
      throw new HttpException(
        "You can only remove moderator roles that you assigned",
        403,
      );
    }
    // Prevent moderator from removing themselves
    if (targetRole.community_platform_member_id === props.member.id) {
      throw new HttpException("You cannot remove your own moderator role", 400);
    }
  } else {
    throw new HttpException("Invalid caller role type", 403);
  }
  // Check if the target member is the community owner (extra protection)
  if (targetRole.community_platform_member_id === community.owner_member_id) {
    throw new HttpException(
      "Cannot remove moderation role from community owner",
      400,
    );
  }
  // Soft delete the moderation role
  const now = new Date().toISOString();
  await MyGlobal.prisma.community_platform_moderation_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
}
