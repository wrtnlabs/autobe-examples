import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformModerationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerationRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunityIdModerationRolesRoleId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.IUpdate;
}): Promise<ICommunityPlatformModerationRole> {
  // 1. Verify community exists and is active
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { id: true, owner_member_id: true },
    });
  // 2. Verify role exists, belongs to community, and is active
  const existingRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findUniqueOrThrow(
      {
        where: {
          id: props.roleId,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
        select: {
          id: true,
          role_type: true,
          community_platform_member_id: true,
          assigned_by_community_platform_member_id: true,
        },
      },
    );
  // 3. Check if requester is community owner (can update any role)
  const isOwner = community.owner_member_id === props.member.id;
  // 4. If not owner, check if requester is moderator assigned to this role
  if (!isOwner) {
    // Check if requester has moderation role in this community
    const requesterRole =
      await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
        where: {
          community_platform_member_id: props.member.id,
          community_platform_community_id: props.communityId,
          deleted_at: null,
        },
      });
    if (!requesterRole) {
      throw new HttpException(
        "Requester has no moderation role in this community",
        403,
      );
    }
    // Moderators can only update roles they assigned
    const isRoleAssignedByRequester =
      existingRole.assigned_by_community_platform_member_id === props.member.id;
    if (!isRoleAssignedByRequester) {
      throw new HttpException(
        "Moderators can only update roles they assigned",
        403,
      );
    }
  }
  // 5. Validate assigned_by_member_id if provided
  if (props.body.assigned_by_member_id !== undefined) {
    if (props.body.assigned_by_member_id !== null) {
      await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
        where: { id: props.body.assigned_by_member_id, deleted_at: null },
      });
    }
    // Update the role
    await MyGlobal.prisma.community_platform_moderation_roles.update({
      where: { id: props.roleId },
      data: {
        assigned_by_community_platform_member_id:
          props.body.assigned_by_member_id,
        updated_at: new Date(),
      },
    });
  }
  // 6. Return updated role using transformer
  const updatedRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findUniqueOrThrow(
      {
        where: { id: props.roleId },
        ...CommunityPlatformModerationRoleTransformer.select(),
      },
    );
  return await CommunityPlatformModerationRoleTransformer.transform(
    updatedRole,
  );
}
