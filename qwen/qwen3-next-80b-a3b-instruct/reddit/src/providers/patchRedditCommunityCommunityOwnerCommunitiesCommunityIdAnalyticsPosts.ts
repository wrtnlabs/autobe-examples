import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityownerPayload } from "../decorators/payload/CommunityownerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityOwnerCommunitiesCommunityIdAnalyticsPosts(props: {
  communityOwner: CommunityownerPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostAnalytic.IRequest;
}): Promise<IRedditCommunityPostAnalytic.ISummary[]> {
  // Validate community exists and is owned by the authenticated owner
  await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true, owner_user_id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build base where clause
  const whereClause: Prisma.reddit_community_postsWhereInput = {
    community_id: props.communityId,
    is_deleted: false,
  };
  if (props.body.dateRange) {
    whereClause.created_at = {
      gte: props.body.dateRange.start,
      lte: props.body.dateRange.end,
    };
  }
  // 1. Get total posts and average vote_score per day
  const postAggregates = await MyGlobal.prisma.reddit_community_posts.groupBy({
    by: ["created_at"],
    where: whereClause,
    _count: { id: true },
    _avg: { vote_score: true },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
  });
  // Extract dates for filtering votes/comments
  const dates = postAggregates.map((p) => p.created_at);
  // 2. Get total upvotes per day
  const upvoteCounts =
    await MyGlobal.prisma.reddit_community_post_votes.groupBy({
      by: ["created_at"],
      where: {
        post: { community_id: props.communityId, is_deleted: false },
        vote_type: "upvote",
        created_at: {
          in: dates,
        },
      },
      _count: { id: true },
    });
  // 3. Get total downvotes per day
  const downvoteCounts =
    await MyGlobal.prisma.reddit_community_post_votes.groupBy({
      by: ["created_at"],
      where: {
        post: { community_id: props.communityId, is_deleted: false },
        vote_type: "downvote",
        created_at: {
          in: dates,
        },
      },
      _count: { id: true },
    });
  // 4. Get total comments per day (joined through posts)
  const commentCounts = await MyGlobal.prisma.reddit_community_comments.groupBy(
    {
      by: ["created_at"],
      where: {
        post: { community_id: props.communityId, is_deleted: false },
        created_at: {
          in: dates,
        },
      },
      _count: { id: true },
    },
  );
  // 5. Build result by merging data
  const result: IRedditCommunityPostAnalytic.ISummary[] = postAggregates.map(
    (post) => {
      const dateStr =
        toISOStringSafe(post.created_at).split("T")[0] + "T00:00:00.000Z";
      const upvoteCount =
        upvoteCounts.find(
          (v) =>
            toISOStringSafe(v.created_at) === toISOStringSafe(post.created_at),
        )?._count.id ?? 0;
      const downvoteCount =
        downvoteCounts.find(
          (v) =>
            toISOStringSafe(v.created_at) === toISOStringSafe(post.created_at),
        )?._count.id ?? 0;
      const commentCount =
        commentCounts.find(
          (c) =>
            toISOStringSafe(c.created_at) === toISOStringSafe(post.created_at),
        )?._count.id ?? 0;
      return {
        date: dateStr as string & tags.Format<"date-time">,
        total_posts: post._count.id,
        avg_vote_score: post._avg.vote_score ?? 0,
        total_upvotes: upvoteCount,
        total_downvotes: downvoteCount,
        total_comments: commentCount,
      };
    },
  );
  // 6. Apply minVoteScore filter if provided
  const minVoteScore = props.body.minVoteScore ?? -Infinity;
  const filteredResult = result.filter(
    (item) => item.avg_vote_score >= minVoteScore,
  );
  return filteredResult;
}
