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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformBanTransformer } from "../transformers/CommunityPlatformBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformBan> {
  // 1. Verify member has moderation role in the community
  const moderationRole =
    await MyGlobal.prisma.community_platform_moderation_roles.findFirst({
      where: {
        member: { id: props.member.id },
        community: { id: props.communityId },
        role_type: { in: ["owner", "moderator"] },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (!moderationRole) {
    throw new HttpException(
      "Only community moderators can view ban details",
      403,
    );
  }
  // 2. Verify community exists
  await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
  });
  // 3. Fetch the ban with proper authorization check (must belong to this community)
  const ban = await MyGlobal.prisma.community_platform_bans.findUniqueOrThrow({
    where: {
      id: props.banId,
      community_id: props.communityId,
      deleted_at: null,
    },
    ...CommunityPlatformBanTransformer.select(),
  });
  // 4. Transform to DTO
  return await CommunityPlatformBanTransformer.transform(ban);
}
