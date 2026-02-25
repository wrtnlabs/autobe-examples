import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformUserCommunitiesRecommendations(props: {
  user: UserPayload;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Get user's subscribed communities to exclude
  const userSubscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: {
        community_platform_user_id: props.user.id,
        deleted_at: null,
        unsubscribed_at: null,
      },
      select: {
        community_platform_community_id: true,
      },
    });
  const subscribedCommunityIds = userSubscriptions.map(
    (sub) => sub.community_platform_community_id,
  );
  // Query recommended communities (excluding subscribed ones)
  const recommendedCommunities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: {
        deleted_at: null,
        id: {
          notIn: subscribedCommunityIds,
        },
      },
      skip,
      take: limit,
      orderBy: [
        { statistic: { subscriber_count: "desc" } },
        { created_at: "desc" },
      ],
      ...CommunityPlatformCommunityAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.community_platform_communities.count({
    where: {
      deleted_at: null,
      id: {
        notIn: subscribedCommunityIds,
      },
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    recommendedCommunities,
    CommunityPlatformCommunityAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
