import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditLikeCommunityAtSummaryTransformer } from "../transformers/RedditLikeCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeMemberSubscriptions(props: {
  member: AdminPayload;
  body: IRedditLikeCommunitySubscription.IRequest;
}): Promise<IPageIRedditLikeCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build order by based on sort parameter
  let orderBy: Prisma.reddit_like_community_subscriptionsOrderByWithRelationInput;
  if (props.body.sort === "name") {
    orderBy = { community: { name: "asc" } };
  } else if (props.body.sort === "-name") {
    orderBy = { community: { name: "desc" } };
  } else if (props.body.sort === "created_at") {
    orderBy = { created_at: "asc" };
  } else {
    // Default: sort by subscription created_at descending (newest first)
    orderBy = { created_at: "desc" };
  }
  // Build where clause
  const where = {
    reddit_like_member_id: props.member.id,
    deleted_at: null,
    community: {
      deleted_at: null,
      ...(props.body.search && {
        name: { contains: props.body.search, mode: "insensitive" as const },
      }),
    },
  } satisfies Prisma.reddit_like_community_subscriptionsWhereInput;
  // Query subscriptions with community data
  const subscriptions =
    await MyGlobal.prisma.reddit_like_community_subscriptions.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        community: RedditLikeCommunityAtSummaryTransformer.select(),
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.reddit_like_community_subscriptions.count(
    {
      where,
    },
  );
  // Transform communities
  const communities = await ArrayUtil.asyncMap(subscriptions, async (sub) =>
    RedditLikeCommunityAtSummaryTransformer.transform(sub.community),
  );
  return {
    data: communities,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
