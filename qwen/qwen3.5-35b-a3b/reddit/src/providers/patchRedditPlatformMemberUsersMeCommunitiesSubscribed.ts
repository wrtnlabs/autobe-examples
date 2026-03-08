import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
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

export async function patchRedditPlatformMemberUsersMeCommunitiesSubscribed(props: {
  member: MemberPayload;
  body: IRedditPlatformCommunity.ISubscribedRequest;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "newest";
  const orderBy =
    sort === "oldest"
      ? { subscribed_at: "asc" as const }
      : { subscribed_at: "desc" as const };
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: {
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
        community: {
          deleted_at: null,
        },
      },
      include: {
        community: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                display_name: true,
                bio: true,
                avatar_url: true,
                karma_score: true,
                created_at: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy,
    });
  const total =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
      where: {
        reddit_platform_member_id: props.member.id,
        deleted_at: null,
        community: {
          deleted_at: null,
        },
      },
    });
  const transformedData = subscriptions.map((subscription) => {
    const community = subscription.community;
    const owner = community.owner;
    const memberSubscriptionCount =
      MyGlobal.prisma.reddit_platform_community_subscriptions.count({
        where: {
          reddit_platform_member_id: owner.id,
          deleted_at: null,
        },
      });
    return {
      id: community.id as string & tags.Format<"uuid">,
      name: community.name,
      description: community.description ?? undefined,
      icon_url: community.icon_url ?? undefined,
      subscriber_count: community.subscriber_count,
      author: {
        id: owner.id as string & tags.Format<"uuid">,
        username: owner.username,
        displayName: owner.display_name,
        bio: owner.bio,
        avatarUrl: owner.avatar_url,
        karmaScore: owner.karma_score,
        createdAt: owner.created_at.toISOString(),
        subscriptionCount: 0,
      } satisfies IRedditPlatformMember.ISummary,
      created_at: community.created_at.toISOString(),
    } satisfies IRedditPlatformCommunity.ISummary;
  });
  const subscriptionCounts = await Promise.all(
    transformedData.map((item) =>
      MyGlobal.prisma.reddit_platform_community_subscriptions
        .count({
          where: {
            reddit_platform_member_id: item.author.id,
            deleted_at: null,
          },
        })
        .then((count) => ({ id: item.author.id, count })),
    ),
  );
  const countMap = new Map(
    subscriptionCounts.map(({ id, count }) => [id, count]),
  );
  const enrichedData = transformedData.map((item) => ({
    ...item,
    author: {
      ...item.author,
      subscriptionCount: countMap.get(item.author.id) ?? 0,
    },
  }));
  return {
    data: enrichedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIRedditPlatformCommunity.ISummary;
}
