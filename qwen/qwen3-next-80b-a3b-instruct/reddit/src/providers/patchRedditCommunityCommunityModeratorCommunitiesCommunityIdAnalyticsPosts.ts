import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityCommunityModeratorCommunitiesCommunityIdAnalyticsPosts(props: {
  communityModerator: CommunitymoderatorPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostAnalytic.IRequest;
}): Promise<IRedditCommunityPostAnalytic.ISummary> {
  const { dateRange, minVoteScore } = props.body;
  // Validate community exists and moderator has access
  const community =
    await MyGlobal.prisma.reddit_community_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: { id: true },
    });
  // Define date range for filtering
  const whereClause: Prisma.Sql = Prisma.sql`
    rcp.community_id = ${props.communityId}
    AND rcp.is_deleted = false
    ${
      dateRange
        ? Prisma.sql`
      AND rcp.created_at >= ${dateRange.start}
      AND rcp.created_at <= ${dateRange.end}
    `
        : Prisma.sql``
    }
  `;
  // Query: Aggregate across all days in range to produce single summary
  const result = await MyGlobal.prisma.$queryRaw<
    Array<{
      total_posts: number;
      avg_vote_score: number;
      total_upvotes: number;
      total_downvotes: number;
      total_comments: number;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*) AS total_posts,
      AVG(rcp.vote_score) AS avg_vote_score,
      SUM(CASE WHEN rcpv.vote_type = 'upvote' THEN 1 ELSE 0 END) AS total_upvotes,
      SUM(CASE WHEN rcpv.vote_type = 'downvote' THEN 1 ELSE 0 END) AS total_downvotes,
      COUNT(rcpc.id) AS total_comments
    FROM reddit_community_posts rcp
    LEFT JOIN reddit_community_post_votes rcpv ON rcpv.post_id = rcp.id
    LEFT JOIN reddit_community_comments rcpc ON rcpc.post_id = rcp.id AND rcpc.is_deleted = false
    WHERE ${whereClause}
    ${minVoteScore ? Prisma.sql`HAVING AVG(rcp.vote_score) >= ${minVoteScore}` : Prisma.sql``}
  `);
  // Extract single result (Guaranteed to return one row with totals)
  const row = result[0];
  // Convert current ISO string for date based on system time
  const today = new Date().toISOString() as string & tags.Format<"date-time">;
  // Return single summary object
  return {
    date: today,
    total_posts: row.total_posts,
    avg_vote_score: row.avg_vote_score,
    total_upvotes: row.total_upvotes,
    total_downvotes: row.total_downvotes,
    total_comments: row.total_comments,
  } satisfies IRedditCommunityPostAnalytic.ISummary;
}
