import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityBanTransformer } from "../transformers/CommunityPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformMemberCommunitiesCommunityNameBansBanId(props: {
  member: MemberPayload;
  communityName: string;
  banId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformCommunityBan> {
  // Find community by name (case-insensitive)
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: {
        name: {
          equals: props.communityName,
          mode: "insensitive",
        },
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // Check authorization: owner or moderator
  const isOwner = community.owner_id === props.member.id;
  const moderatorRecord =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: community.id,
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const isModerator = moderatorRecord !== null;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve ban record using transformer
  const ban =
    await MyGlobal.prisma.community_platform_community_bans.findUniqueOrThrow({
      where: {
        id: props.banId,
      },
      ...CommunityPlatformCommunityBanTransformer.select(),
    });
  // Verify ban belongs to the specified community
  if (ban.community.id !== community.id) {
    throw new HttpException("Ban not found in this community", 404);
  }
  return await CommunityPlatformCommunityBanTransformer.transform(ban);
}
