import { ICommunityPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBan";
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
import { CommunityPlatformBanCollector } from "../collectors/CommunityPlatformBanCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformMemberCommunityIdBans(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformBan.ICreate;
}): Promise<ICommunityPlatformBan> {
  // 1. Verify community exists
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
    });
  // 2. Check if authenticated member has moderation role in this community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        community_platform_member_id: props.member.id,
        community_platform_community_id: props.communityId,
        role_type: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
      select: { id: true },
    });
  if (!moderationRole) {
    throw new HttpException(
      "Forbidden - You do not have moderation permissions in this community",
      403,
    );
  }
  // 3. Prevent self-ban
  if (props.body.memberId === props.member.id) {
    throw new HttpException("Forbidden - You cannot ban yourself", 400);
  }
  // 4. Verify the target user exists
  const targetMember =
    await MyGlobal.prisma.community_platform_members.findUniqueOrThrow({
      where: {
        id: props.body.memberId,
        deleted_at: null,
      },
      select: { id: true },
    });
  // 5. Prevent banning community owner
  const communityOwner =
    await MyGlobal.prisma.community_platform_communities.findUnique({
      where: {
        id: props.communityId,
        deleted_at: null,
      },
      select: { owner_member_id: true },
    });
  if (targetMember.id === communityOwner?.owner_member_id) {
    throw new HttpException("Forbidden - Cannot ban the community owner", 400);
  }
  // 6. Validate expiresAt if provided
  if (props.body.expiresAt !== undefined && props.body.expiresAt !== null) {
    const expiresAt = new Date(props.body.expiresAt);
    const now = new Date();
    if (expiresAt <= now) {
      throw new HttpException(
        "Bad Request - Expiration date must be in the future",
        400,
      );
    }
  }
  // 7. Check for existing active ban (prevent duplicates)
  const existingBan = await MyGlobal.prisma.community_platform_bans.findFirst({
    where: {
      member_id: props.body.memberId,
      community_id: props.communityId,
      active: true,
      deleted_at: null,
    },
  });
  if (existingBan) {
    throw new HttpException(
      "Conflict - User is already banned in this community",
      409,
    );
  }
  // 8. Prepare collector inputs with proper typing
  const communityEntity = {
    id: community.id satisfies string as string & tags.Format<"uuid">,
  } satisfies IEntity;
  const moderationRoleEntity = {
    id: moderationRole.id satisfies string as string & tags.Format<"uuid">,
  } satisfies IEntity;
  // 9. Create ban using collector
  const created = await MyGlobal.prisma.community_platform_bans.create({
    data: await CommunityPlatformBanCollector.collect({
      body: props.body,
      communityPlatformCommunities: communityEntity,
      communityPlatformModerationRoles: moderationRoleEntity,
    }),
    ...CommunityPlatformBanTransformer.select(),
  });
  // 10. Transform and return
  return await CommunityPlatformBanTransformer.transform(created);
}
