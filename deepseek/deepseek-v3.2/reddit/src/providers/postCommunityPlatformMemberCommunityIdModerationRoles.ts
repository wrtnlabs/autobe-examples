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
import { CommunityPlatformModerationRoleCollector } from "../collectors/CommunityPlatformModerationRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformModerationRoleTransformer } from "../transformers/CommunityPlatformModerationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunityIdModerationRoles(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModerationRole.ICreate;
}): Promise<ICommunityPlatformModerationRole> {
  // 1. Verify requester has moderation role in community
  const requesterRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.member.id,
        deleted_at: null,
      },
      select: { id: true, role_type: true },
    });
  if (!requesterRole) {
    throw new HttpException(
      "You must be a moderator or owner of this community",
      403,
    );
  }
  // 2. Verify target member exists
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findUnique({
      where: { id: props.body.memberId, deleted_at: null },
      select: { id: true },
    });
  if (!targetMember) {
    throw new HttpException("Target member not found", 404);
  }
  // 3. Check community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: { id: props.communityId },
      select: { id: true },
    });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // 4. Prevent duplicate role
  const existingRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_community_id: props.communityId,
        community_platform_member_id: props.body.memberId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingRole) {
    throw new HttpException(
      "User already has moderation role in this community",
      409,
    );
  }
  // 5. Use Collector to create role
  const created =
    await MyGlobal.prisma.community_platform_moderation_roles.create({
      data: await CommunityPlatformModerationRoleCollector.collect({
        body: props.body,
        communityPlatformCommunities: { id: props.communityId } as IEntity,
        communityPlatformMembers: { id: props.member.id } as IEntity,
      }),
      ...CommunityPlatformModerationRoleTransformer.select(),
    });
  // 6. Transform and return
  return await CommunityPlatformModerationRoleTransformer.transform(created);
}
