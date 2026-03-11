import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditPlatformCommunityAtSummaryTransformer } from "../transformers/RedditPlatformCommunityAtSummaryTransformer";
import { RedditPlatformCommunityBanTransformer } from "../transformers/RedditPlatformCommunityBanTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditPlatformAdminCommunitiesCommunityIdBansBanId(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  banId: string & tags.Format<"uuid">;
  body: IRedditPlatformCommunityBan.IUnban;
}): Promise<IRedditPlatformCommunityBan> {
  const unbanTimestamp = new Date();
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { owner_id: true },
    });
  const isOwner = community.owner_id === props.admin.id;
  const isModerator =
    await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        community_id: props.communityId,
        user_id: props.admin.id,
      },
      select: { id: true },
    });
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  const ban =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      select: {
        id: true,
        community_id: true,
        user_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        expires_at: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            created_at: true,
            owner: RedditPlatformCommunityAtSummaryTransformer.select(),
          },
        },
        bannedUser: {
          select: {
            id: true,
            username: true,
            display_name: true,
            karma_score: true,
            is_active: true,
            created_at: true,
          },
        },
      },
    });
  if (ban.community_id !== props.communityId) {
    throw new HttpException("Ban does not belong to this community", 400);
  }
  await MyGlobal.prisma.reddit_platform_community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: unbanTimestamp,
      updated_at: unbanTimestamp,
    },
  });
  const updatedBan =
    await MyGlobal.prisma.reddit_platform_community_bans.findUniqueOrThrow({
      where: { id: props.banId },
      ...RedditPlatformCommunityBanTransformer.select(),
    });
  return await RedditPlatformCommunityBanTransformer.transform(updatedBan);
}
