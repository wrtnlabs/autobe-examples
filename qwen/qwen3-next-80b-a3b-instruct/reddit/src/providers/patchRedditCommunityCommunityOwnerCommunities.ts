import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { RedditCommunityCommunityAtSummaryTransformer } from "../transformers/RedditCommunityCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerCommunities(props: {
  communityOwner: CommunityownerPayload;
  body: IRedditCommunityCommunity.IRequest;
}): Promise<IPageIRedditCommunityCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const search = props.body.search?.toLowerCase().trim();
  const sortBy = props.body.sort ?? "top";
  // Build where clause
  const where: Prisma.reddit_community_communitiesWhereInput = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};
  // Use transformer select to get necessary relations
  const data = await MyGlobal.prisma.reddit_community_communities.findMany({
    where,
    skip,
    take: limit * 10, // Fetch extra for client-side sorting
    ...RedditCommunityCommunityAtSummaryTransformer.select(),
  });
  // Transform to ISummary (this includes subscriber_count and posts array)
  const transformedData = await ArrayUtil.asyncMap(
    data,
    RedditCommunityCommunityAtSummaryTransformer.transform,
  );
  // Apply sorting based on type - post_count is the length of posts array
  const sortedData = [...transformedData].sort((a, b) => {
    if (search) {
      // Prefix match first
      const aIsPrefix = a.name.startsWith(search);
      const bIsPrefix = b.name.startsWith(search);
      if (aIsPrefix && !bIsPrefix) return -1;
      if (!aIsPrefix && bIsPrefix) return 1;
      // Then sort by subscriber_count descending
      return b.subscriber_count - a.subscriber_count;
    }
    if (sortBy === "new") {
      // Most recent first
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
    if (sortBy === "top") {
      // Highest subscriber count first
      return b.subscriber_count - a.subscriber_count;
    }
    if (sortBy === "hot") {
      // HotScore = log10(Upvotes + 1) + (CreationTimeInHours / 4.5)
      // Use post_count as proxy for upvotes (post_count = posts.length)
      const postCountA = a.posts?.length || 0;
      const postCountB = b.posts?.length || 0;
      const logScoreA = Math.log10(postCountA + 1);
      const logScoreB = Math.log10(postCountB + 1);
      const timeA =
        (Date.now() - new Date(a.created_at).getTime()) / (1000 * 3600);
      const timeB =
        (Date.now() - new Date(b.created_at).getTime()) / (1000 * 3600);
      const hotA = logScoreA + timeA / 4.5;
      const hotB = logScoreB + timeB / 4.5;
      return hotB - hotA;
    }
    if (sortBy === "controversial") {
      // ControversyScore = abs(Upvotes - Downvotes) / (Upvotes + Downvotes + 1)
      // Use post_count as proxy for total votes (post_count = posts.length)
      const totalVotesA = a.posts?.length || 0;
      const totalVotesB = b.posts?.length || 0;
      if (totalVotesA === 0 && totalVotesB === 0) return 0;
      if (totalVotesA === 0) return 1; // b should come before a
      if (totalVotesB === 0) return -1; // a should come before b
      // Approximate controversy inverse: more votes = less controversy
      // Higher controversy score means higher ranking
      return 1 / (totalVotesB + 1) - 1 / (totalVotesA + 1);
    }
    // Default to top
    return b.subscriber_count - a.subscriber_count;
  });
  // Apply pagination to sorted list
  const paginatedData = sortedData.slice(skip, skip + limit);
  // Get total count for pagination metadata
  const total = await MyGlobal.prisma.reddit_community_communities.count({
    where,
  });
  return {
    data: paginatedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
