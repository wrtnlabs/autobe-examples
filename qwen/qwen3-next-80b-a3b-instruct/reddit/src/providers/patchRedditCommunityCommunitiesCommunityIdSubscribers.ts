import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySubscription";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunitySubscriptionAtSummaryTransformer } from "../transformers/RedditCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdSubscribers(props: {
  communityId: string;
  body: IRedditCommunitySubscription.IRequest;
}): Promise<IPageIRedditCommunitySubscription.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate sort value
  if (props.body.sort && !["newest", "oldest"].includes(props.body.sort)) {
    throw new HttpException("Invalid sort option", 400);
  }
  const where: Prisma.reddit_community_subscriptionsWhereInput = {
    community_id: props.communityId,
    user: {
      OR: props.body.search
        ? [
            { username: { contains: props.body.search, mode: "insensitive" } },
            {
              display_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ]
        : undefined,
    },
  };
  const orderBy: Prisma.reddit_community_subscriptionsOrderByWithRelationInput =
    props.body.sort === "oldest"
      ? { created_at: "asc" }
      : { created_at: "desc" };
  const data = await MyGlobal.prisma.reddit_community_subscriptions.findMany({
    where,
    skip,
    take: limit,
    orderBy,
    ...RedditCommunitySubscriptionAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_subscriptions.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
