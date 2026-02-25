import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PlatformadminPayload } from "../decorators/payload/PlatformadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPlatformAdminCommunitiesCommunityIdAnalyticsPosts(props: {
  platformAdmin: PlatformadminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostAnalytic.IRequest;
}): Promise<IRedditCommunityPostAnalytic.ISummary[]> {
  // Validate community exists
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
    });
  // Extract pagination and filtering parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause with optional date range and community filter
  const where: Prisma.reddit_community_postsWhereInput = {
    community_id: props.communityId,
    is_deleted: false,
    ...(props.body.dateRange && {
      created_at: {
        gte: props.body.dateRange.start,
        lte: props.body.dateRange.end,
      },
    }),
  };
  // Group by day using DATE_TRUNC for accurate calendar day grouping
  // Use raw SQL to ensure proper date truncation on PostgreSQL
  interface IQueryResult {
    created_at: Date;
    total_posts: string;
    avg_vote_score: string | null;
    total_comments: string;
  }
  const rawResults: IQueryResult[] = (await MyGlobal.prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('day', created_at) AS created_at,
      COUNT(*) as total_posts,
      AVG(vote_score) as avg_vote_score,
      SUM(comment_count) as total_comments
    FROM reddit_community_posts 
    WHERE 
      community_id = ${props.communityId} AND 
      is_deleted = false
      ${props.body.dateRange ? `AND created_at >= ${props.body.dateRange.start} AND created_at <= ${props.body.dateRange.end}` : ""}
    GROUP BY DATE_TRUNC('day', created_at)
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${skip}
  `) as IQueryResult[];
  // Calculate total upvotes and downvotes per day using separate queries
  const dailyTotals: IRedditCommunityPostAnalytic.ISummary[] = [];
  for (const group of rawResults) {
    // Ensure date is properly formatted as string & Format<'date-time'> using toISOStringSafe
    const date = toISOStringSafe(
      new Date(group.created_at),
    ) satisfies string as string & tags.Format<"date-time">;
    // Count upvotes for all posts on this day
    const upvotes = await MyGlobal.prisma.reddit_community_post_votes.count({
      where: {
        post: {
          community_id: props.communityId,
          is_deleted: false,
          created_at: {
            gte: group.created_at,
            lt: toISOStringSafe(
              new Date(group.created_at.getTime() + 24 * 60 * 60 * 1000),
            ) satisfies string as string & tags.Format<"date-time">,
          },
        },
        vote_type: "upvote",
      },
    });
    // Count downvotes for all posts on this day
    const downvotes = await MyGlobal.prisma.reddit_community_post_votes.count({
      where: {
        post: {
          community_id: props.communityId,
          is_deleted: false,
          created_at: {
            gte: group.created_at,
            lt: toISOStringSafe(
              new Date(group.created_at.getTime() + 24 * 60 * 60 * 1000),
            ) satisfies string as string & tags.Format<"date-time">,
          },
        },
        vote_type: "downvote",
      },
    });
    dailyTotals.push({
      date: date,
      total_posts: parseInt(group.total_posts, 10),
      avg_vote_score: group.avg_vote_score
        ? parseFloat(group.avg_vote_score)
        : 0,
      total_upvotes: upvotes,
      total_downvotes: downvotes,
      total_comments: group.total_comments
        ? parseInt(group.total_comments, 10)
        : 0,
    });
  }
  return dailyTotals;
}
