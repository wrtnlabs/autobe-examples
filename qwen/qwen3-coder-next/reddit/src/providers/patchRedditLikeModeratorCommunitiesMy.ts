import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeModeratorCommunitiesMy(props: {
  moderator: ModeratorPayload;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const limit = 100;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.moderator.id,
        status: "subscribed",
        deleted_at: null,
      },
      take: limit,
      orderBy: { created_at: "desc" as const },
      select: {
        reddit_like_community_id: true,
        created_at: true,
        updated_at: true,
      },
    }),
    MyGlobal.prisma.reddit_like_subscriptions.count({
      where: {
        reddit_like_member_id: props.moderator.id,
        status: "subscribed",
        deleted_at: null,
      },
    }),
  ]);
  const communityIds = data.map((sub) => sub.reddit_like_community_id);
  const communities = await MyGlobal.prisma.reddit_like_communities.findMany({
    where: {
      id: { in: communityIds },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      icon_url: true,
    },
  });
  const subscriptionsCount =
    await MyGlobal.prisma.reddit_like_subscriptions.groupBy({
      by: ["reddit_like_community_id"],
      where: {
        reddit_like_member_id: props.moderator.id,
        status: "subscribed",
        deleted_at: null,
      },
      _count: { reddit_like_community_id: true },
    });
  const communitySubscriberCounts = new Map<string, number>();
  subscriptionsCount.forEach((item) => {
    communitySubscriberCounts.set(
      item.reddit_like_community_id,
      item._count.reddit_like_community_id,
    );
  });
  const dataResult: IRedditLikeCommunity.ISummary[] = data
    .map((sub) => {
      const community = communities.find(
        (c) => c.id === sub.reddit_like_community_id,
      );
      if (!community) return null;
      return {
        name: community.name,
        icon_url: community.icon_url,
        subscriber_count:
          communitySubscriberCounts.get(sub.reddit_like_community_id) ?? 0,
      } satisfies IRedditLikeCommunity.ISummary;
    })
    .filter((item): item is IRedditLikeCommunity.ISummary => item !== null);
  return {
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
    data: dataResult,
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
