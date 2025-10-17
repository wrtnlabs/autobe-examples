import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunitySubscription";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";

export async function getRedditLikeUsersUserIdSubscriptions(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IPageIRedditLikeCommunitySubscription.ISummary> {
  const { userId } = props;

  // Verify user exists and check privacy settings
  const user = await MyGlobal.prisma.reddit_like_users.findUniqueOrThrow({
    where: { id: userId },
    select: {
      id: true,
      show_subscriptions_publicly: true,
    },
  });

  // Privacy control: Only public subscriptions are accessible without authentication
  if (!user.show_subscriptions_publicly) {
    throw new HttpException(
      "This user's subscription list is set to private",
      403,
    );
  }

  // Default pagination configuration
  const page = 0;
  const limit = 20;
  const skip = page * limit;

  // Fetch subscriptions with community details
  const [subscriptions, total] = await Promise.all([
    MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where: {
        member_id: userId,
      },
      include: {
        community: {
          select: {
            id: true,
            code: true,
            name: true,
            description: true,
            icon_url: true,
            subscriber_count: true,
            primary_category: true,
          },
        },
      },
      orderBy: {
        subscribed_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.reddit_like_community_subscriptions.count({
      where: {
        member_id: userId,
      },
    }),
  ]);

  // Transform subscriptions to API response format
  const data = subscriptions.map((sub) => {
    const truncatedDescription =
      sub.community.description !== null &&
      sub.community.description.length > 100
        ? sub.community.description.substring(0, 100)
        : sub.community.description;

    return {
      id: sub.id,
      community: {
        id: sub.community.id,
        code: sub.community.code,
        name: sub.community.name,
        description: truncatedDescription ?? undefined,
        icon_url: sub.community.icon_url ?? undefined,
        subscriber_count: sub.community.subscriber_count,
        primary_category: sub.community.primary_category,
      },
      subscribed_at: toISOStringSafe(sub.subscribed_at),
    };
  });

  // Build pagination metadata with Number() conversion
  const totalPages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: Number(total),
      pages: Number(totalPages),
    },
    data: data,
  };
}
