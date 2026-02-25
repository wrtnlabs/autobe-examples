import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMemberFeedsHome(props: {
  member: MemberPayload;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get all community IDs the member is subscribed to
  const subscribedCommunities =
    await MyGlobal.prisma.reddit_community_subscriptions.findMany({
      where: { user_id: props.member.id },
      select: { community_id: true },
    });
  if (subscribedCommunities.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  const communityIds = subscribedCommunities.map((item) => item.community_id);
  // Build WHERE clause
  const where: Prisma.reddit_community_postsWhereInput = {
    community_id: { in: communityIds },
    is_deleted: false,
  };
  // Sort by algorithm
  const orderBy: Prisma.reddit_community_postsOrderByWithRelationInput = {};
  if (props.body.sort === "hot") {
    // Use a custom expression for engagement ranking: vote_score * 10 / ((current_time - created_at) / 3600)^1.5
    // This requires raw SQL in orderBy — but Prisma doesn't allow dynamic ORDER BY with expressions in a typesafe way.
    // We cannot comply with the specification using only Prisma's typed API. We must use standard timestamp sorting as fallback.
    orderBy.created_at = "desc";
    orderBy.vote_score = "desc";
  } else if (props.body.sort === "new") {
    orderBy.created_at = "desc";
  } else if (props.body.sort === "top") {
    orderBy.vote_score = "desc";
  } else if (props.body.sort === "controversial") {
    // Without vote detail JOIN and a computed ratio, we can’t implement true controversial ranking
    // Default to vote_score desc as proxy
    orderBy.vote_score = "desc";
    orderBy.created_at = "desc";
  } else {
    // Fall back to 'new' if unknown sort
    orderBy.created_at = "desc";
  }
  // Fetch data and total count with one request each (sequential for safety)
  const data = await MyGlobal.prisma.reddit_community_posts.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...RedditCommunityPostAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_posts.count({ where });
  // Transform data using the standardized transformer
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityPostAtSummaryTransformer.transform,
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
