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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberCommunitiesMy(props: {
  member: MemberPayload;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = 1;
  const limit = 25;
  const skip = (page - 1) * limit;
  const subscriptions =
    await MyGlobal.prisma.reddit_like_subscriptions.findMany({
      where: {
        reddit_like_member_id: props.member.id,
        status: "subscribed",
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        community: {
          select: {
            id: true,
            name: true,
            icon_url: true,
          },
        },
      },
    });
  const total = await MyGlobal.prisma.reddit_like_subscriptions.count({
    where: {
      reddit_like_member_id: props.member.id,
      status: "subscribed",
    },
  });
  const communityIds = subscriptions.map((s) => s.community.id);
  const subscriberCounts =
    await MyGlobal.prisma.reddit_like_subscriptions.groupBy({
      by: ["reddit_like_community_id"],
      where: {
        reddit_like_community_id: { in: communityIds },
        status: "subscribed",
      },
      _count: {
        reddit_like_community_id: true,
      },
    });
  const countMap = new Map<string, number>();
  for (const item of subscriberCounts) {
    countMap.set(
      item.reddit_like_community_id,
      item._count.reddit_like_community_id,
    );
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: subscriptions.map(
      (sub) =>
        ({
          name: sub.community.name,
          icon_url: sub.community.icon_url,
          subscriber_count: countMap.get(sub.community.id) ?? 0,
        }) satisfies IRedditLikeCommunity.ISummary,
    ),
  } satisfies IPageIRedditLikeCommunity.ISummary;
}
