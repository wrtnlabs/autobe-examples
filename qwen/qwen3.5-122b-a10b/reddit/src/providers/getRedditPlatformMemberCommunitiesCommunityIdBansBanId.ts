import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberCommunitiesCommunityIdBansBanId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommunityBan> {
  // Verify the ban exists and get basic info
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId, deleted_at: null },
      select: { reddit_platform_community_id: true },
    });
  // Verify ban belongs to the specified community
  if (ban.reddit_platform_community_id !== props.communityId) {
    throw new HttpException("Ban not found in this community", 404);
  }
  // Verify member is authorized (moderator or owner)
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_member_id: props.member.id,
        reddit_platform_community_id: props.communityId,
        deleted_at: null,
      },
    });
  if (!isModerator) {
    const community =
      await MyGlobal.prisma.reddit_platform_communities.findUnique({
        where: { id: props.communityId, deleted_at: null },
        select: { owner_id: true },
      });
    if (!community || community.owner_id !== props.member.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Fetch full ban record with relations
  const fullBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId, deleted_at: null },
      ...RedditPlatformCommunityBanTransformer.select(),
    });
  return await RedditPlatformCommunityBanTransformer.transform(fullBan);
}
