import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformUserUsersUserIdSubscribedCommunities(props: {
  user: UserPayload;
  userId: string;
}): Promise<IPageIRedditPlatformCommunity.ISummary> {
  // Validate user authorization - user can only access their own subscriptions
  if (props.user.id !== props.userId) {
    throw new HttpException(
      "Forbidden: You can only access your own subscriptions",
      403,
    );
  }
  // Query subscriptions with pagination
  const subscriptions =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.findMany({
      where: {
        user_id: props.userId,
      },
      include: {
        community: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  // Transform to response format
  const data = subscriptions.map((sub) => ({
    id: sub.community.id,
    name: sub.community.name,
    description: sub.community.description,
    icon_url: sub.community.icon_url,
    subscriber_count: sub.community.subscriber_count,
    created_at: toISOStringSafe(sub.community.created_at),
    updated_at: toISOStringSafe(sub.community.updated_at),
  }));
  // Count total subscriptions for pagination metadata
  const total =
    await MyGlobal.prisma.reddit_platform_community_subscriptions.count({
      where: {
        user_id: props.userId,
      },
    });
  return {
    data,
    pagination: {
      current: 1,
      limit: subscriptions.length,
      records: total,
      pages: Math.ceil(total / Math.max(subscriptions.length, 1)),
    },
  };
}
