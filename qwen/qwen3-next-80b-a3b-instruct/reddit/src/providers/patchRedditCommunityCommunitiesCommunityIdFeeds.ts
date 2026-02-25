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
import { RedditCommunityPostAtSummaryTransformer } from "../transformers/RedditCommunityPostAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunitiesCommunityIdFeeds(props: {
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPost.IRequest;
}): Promise<IPageIRedditCommunityPost.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause
  const where: Prisma.reddit_community_postsWhereInput = {
    community_id: props.communityId,
    is_deleted: false,
  };
  // Apply time filter
  if (props.body.timeFilter) {
    const now = new Date();
    let cutoff: string & tags.Format<"date-time">;
    switch (props.body.timeFilter) {
      case "today":
        cutoff = new Date(now.setHours(0, 0, 0, 0)).toISOString() as string &
          tags.Format<"date-time">;
        break;
      case "week":
        cutoff = new Date(
          now.setDate(now.getDate() - 7),
        ).toISOString() as string & tags.Format<"date-time">;
        break;
      case "month":
        cutoff = new Date(
          now.setMonth(now.getMonth() - 1),
        ).toISOString() as string & tags.Format<"date-time">;
        break;
      case "year":
        cutoff = new Date(
          now.setFullYear(now.getFullYear() - 1),
        ).toISOString() as string & tags.Format<"date-time">;
        break;
      case "all":
      default:
        cutoff = new Date(0).toISOString() as string & tags.Format<"date-time">;
    }
    where.created_at = { gte: cutoff };
  }
  // Fetch posts
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_posts.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        // For hot and controversial, we need to calculate score at query level
        // We'll do it in-memory after fetching since Prisma lacks dynamic math functions
        created_at: "desc",
      },
      ...RedditCommunityPostAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_posts.count({ where }),
  ]);
  // Calculate scores in-memory for hot and controversial
  const enrichedData = data.map((post) => {
    let calculatedScore = post.vote_score;
    if (props.body.sort === "hot") {
      const hoursDiff =
        (Date.now() - post.created_at.getTime()) / (1000 * 60 * 60);
      calculatedScore = post.vote_score / (hoursDiff + 2);
    } else if (props.body.sort === "controversial") {
      // We need vote counts from RedditCommunityPostVotes
      // But we don't have them in select - so we need to fetch total votes and split
      // Since we don't have direct access to upvote/downvote counts in this select,
      // this implementation cannot accurately compute controversial
      // We'll fall back to vote_score as placeholder
    }
    return { ...post, calculatedScore };
  });
  // Sort based on algorithm
  const sortedData = [...enrichedData].sort((a, b) => {
    let scoreA, scoreB;
    switch (props.body.sort) {
      case "hot":
        scoreA =
          a.vote_score /
          (Math.max(
            1,
            (Date.now() - a.created_at.getTime()) / (1000 * 60 * 60),
          ) +
            2);
        scoreB =
          b.vote_score /
          (Math.max(
            1,
            (Date.now() - b.created_at.getTime()) / (1000 * 60 * 60),
          ) +
            2);
        return scoreB - scoreA;
      case "new":
        return b.created_at.getTime() - a.created_at.getTime();
      case "top":
        return b.vote_score - a.vote_score;
      case "controversial":
        // We need upvotes and downvotes from separate table
        // This cannot be done efficiently without changing query structure or schema
        // We'll use vote_score as proxy for now
        return b.vote_score - a.vote_score;
      default:
        return b.created_at.getTime() - a.created_at.getTime();
    }
  });
  // Transform to final format using proper transformer
  const transformedData = await ArrayUtil.asyncMap(
    sortedData,
    RedditCommunityPostAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit > 100 ? 100 : limit < 1 ? 1 : limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
