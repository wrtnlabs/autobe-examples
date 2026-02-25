import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostAnalytic";
import { IRedditCommunityPostAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostAnalytic";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchRedditCommunityMemberAnalyticsPosts(props: {
  member: MemberPayload;
  body: IRedditCommunityPostAnalytic.IRequest;
}): Promise<IPageIRedditCommunityPostAnalytic.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Define date range filters
  const startDate = props.body.dateRange?.start;
  const endDate = props.body.dateRange?.end;
  // Build WHERE conditions and parameter array for SQL
  const whereConditions: string[] = [];
  const whereArgs: any[] = [];
  // Filter out soft-deleted posts
  whereConditions.push("rcp.is_deleted = false");
  // Apply date range filter if provided
  if (startDate) {
    whereConditions.push("rcp.created_at >= $1");
    whereArgs.push(startDate);
  }
  if (endDate) {
    whereConditions.push("rcp.created_at <= $" + (whereArgs.length + 1));
    whereArgs.push(endDate);
  }
  // Filter by community if specified
  if (props.body.communityId) {
    whereConditions.push("rcp.community_id = $" + (whereArgs.length + 1));
    whereArgs.push(props.body.communityId);
  }
  // Main aggregation query using DISTINCT to align with desired group by day
  const aggregationQuery = `
    SELECT 
      DATE_TRUNC('day', rcp.created_at) as date,
      COUNT(rcp.id) as total_posts,
      AVG(rcp.vote_score) as avg_vote_score,
      SUM(CASE WHEN rc_pv.vote_type = 'upvote' THEN 1 ELSE 0 END) as total_upvotes,
      SUM(CASE WHEN rc_pv.vote_type = 'downvote' THEN 1 ELSE 0 END) as total_downvotes,
      COUNT(rc_c.id) as total_comments
    FROM reddit_community_posts rcp
    LEFT JOIN reddit_community_post_votes rc_pv ON rcp.id = rc_pv.post_id
    LEFT JOIN reddit_community_comments rc_c ON rcp.id = rc_c.post_id AND rc_c.deleted_at IS NULL
    WHERE ${whereConditions.join(" AND ")}
    GROUP BY DATE_TRUNC('day', rcp.created_at)
    HAVING COUNT(rcp.id) > 0
    ORDER BY date DESC
    LIMIT $${whereArgs.length + 1}
    OFFSET $${whereArgs.length + 2}`;
  // Append pagination parameters
  whereArgs.push(limit);
  whereArgs.push(skip);
  // Query aggregated results
  const rawResults = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      date: Date;
      total_posts: number;
      avg_vote_score: number;
      total_upvotes: number;
      total_downvotes: number;
      total_comments: number;
    }>
  >(aggregationQuery, ...whereArgs);
  // Format dates to strict ISO string (as per schema requirement)
  const data = rawResults.map(
    (row: {
      date: Date;
      total_posts: number;
      avg_vote_score: number;
      total_upvotes: number;
      total_downvotes: number;
      total_comments: number;
    }) =>
      ({
        date: toISOStringSafe(row.date) as string & tags.Format<"date-time">,
        total_posts: row.total_posts,
        avg_vote_score: row.avg_vote_score,
        total_upvotes: row.total_upvotes,
        total_downvotes: row.total_downvotes,
        total_comments: row.total_comments,
      }) satisfies IRedditCommunityPostAnalytic.ISummary,
  );
  // Apply minVoteScore filter after aggregation
  const filteredData = data.filter(
    (item: IRedditCommunityPostAnalytic.ISummary) => {
      return (
        !props.body.minVoteScore ||
        item.avg_vote_score >= props.body.minVoteScore
      );
    },
  );
  // Total query - determine total count before pagination
  const countQuery = `
    SELECT COUNT(*) as total 
    FROM (
      SELECT DATE_TRUNC('day', rcp.created_at)
      FROM reddit_community_posts rcp
      LEFT JOIN reddit_community_post_votes rc_pv ON rcp.id = rc_pv.post_id
      LEFT JOIN reddit_community_comments rc_c ON rcp.id = rc_c.post_id AND rc_c.deleted_at IS NULL
      WHERE rcp.is_deleted = false
      ${startDate ? "AND rcp.created_at >= $1" : ""}
      ${endDate ? "AND rcp.created_at <= $" + (startDate ? "2" : "1") : ""}
      ${props.body.communityId ? "AND rcp.community_id = $" + ((startDate ? 2 : 1) + (endDate ? 1 : 0)) : ""}
      GROUP BY DATE_TRUNC('day', rcp.created_at)
      HAVING COUNT(rcp.id) > 0
    ) AS grouped`;
  let totalCount: number;
  if (startDate || endDate || props.body.communityId) {
    const countArgs: any[] = [];
    if (startDate) countArgs.push(startDate);
    if (endDate) countArgs.push(endDate);
    if (props.body.communityId) countArgs.push(props.body.communityId);
    const result = await MyGlobal.prisma.$queryRawUnsafe<
      Array<{
        total: number;
      }>
    >(countQuery, ...countArgs);
    totalCount = result && result.length > 0 ? result[0]?.total || 0 : 0;
  } else {
    const result = await MyGlobal.prisma.$queryRawUnsafe<
      Array<{
        total: number;
      }>
    >(
      "SELECT COUNT(*) as total FROM (SELECT DATE_TRUNC('day', created_at) FROM reddit_community_posts WHERE is_deleted = false GROUP BY DATE_TRUNC('day', created_at) HAVING COUNT(id) > 0) AS grouped",
    );
    totalCount = result && result.length > 0 ? result[0]?.total || 0 : 0;
  }
  return {
    data: filteredData,
    pagination: {
      current: page,
      limit,
      records: totalCount,
      pages: Math.ceil(totalCount / limit),
    } satisfies IPage.IPagination,
  };
}
