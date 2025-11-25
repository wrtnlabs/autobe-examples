import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBBSAnalyticsKarmaDistribution } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSAnalyticsKarmaDistribution";

export async function patchCommunityBBSAnalyticsKarmaDistribution(props: {
  body: ICommunityBBSAnalyticsKarmaDistribution.IRequest;
}): Promise<ICommunityBBSAnalyticsKarmaDistribution> {
  // Parse the request body as JSON to extract properties
  const requestBody = JSON.parse(props.body as any);
  const { min_karma, max_karma, from_date, to_date } = requestBody;

  // Build parameterized query with filter conditions
  const queryParams: any[] = [];
  let whereClause = "WHERE 1 = 1";

  // Add karma score filters with parameterized values
  if (min_karma !== undefined) {
    whereClause += " AND karma_score >= $1";
    queryParams.push(min_karma);
  }
  if (max_karma !== undefined) {
    whereClause += " AND karma_score <= $2";
    queryParams.push(max_karma);
  }

  // Add date filters with parameterized values
  if (from_date || to_date) {
    if (from_date) {
      whereClause += " AND karma_last_updated >= $" + (queryParams.length + 1);
      queryParams.push(from_date);
    }
    if (to_date) {
      whereClause += " AND karma_last_updated <= $" + (queryParams.length + 1);
      queryParams.push(to_date);
    }
  }

  // Get total count of users matching filters
  const totalUsers = (await MyGlobal.prisma.$queryRaw`
    SELECT COUNT(*) as count FROM community_bbs_user_karma_summary ${whereClause}
  `) as [{ count: number }] | [];

  const total =
    totalUsers.length > 0 && totalUsers[0] !== undefined
      ? totalUsers[0].count
      : 0;

  // If no users match filters, return empty distribution as JSON string
  if (total === 0) {
    return JSON.stringify({
      "0-25%": 0,
      "25-50%": 0,
      "50-75%": 0,
      "75-100%": 0,
    }) as ICommunityBBSAnalyticsKarmaDistribution;
  }

  // Calculate percentiles using a clean, robust SQL approach with window functions
  const percentileResults = (await MyGlobal.prisma.$queryRaw`
    WITH ranked AS (
      SELECT 
        karma_score,
        ROW_NUMBER() OVER (ORDER BY karma_score ASC) as rn,
        COUNT(*) OVER () as total
      FROM community_bbs_user_karma_summary
      ${whereClause}
    ),
    percentile_bounds AS (
      SELECT 
        FLOOR(0.25 * total) as p25_idx,
        FLOOR(0.50 * total) as p50_idx,
        FLOOR(0.75 * total) as p75_idx
      FROM ranked
      LIMIT 1
    )
    SELECT
      COUNT(CASE WHEN r.rn <= pb.p25_idx THEN 1 END) as "0-25%",
      COUNT(CASE WHEN r.rn > pb.p25_idx AND r.rn <= pb.p50_idx THEN 1 END) as "25-50%",
      COUNT(CASE WHEN r.rn > pb.p50_idx AND r.rn <= pb.p75_idx THEN 1 END) as "50-75%",
      COUNT(CASE WHEN r.rn > pb.p75_idx THEN 1 END) as "75-100%"
    FROM ranked r, percentile_bounds pb
  `) as
    | [
        {
          "0-25%": number;
          "25-50%": number;
          "50-75%": number;
          "75-100%": number;
        },
      ]
    | [];

  // Return the distribution result as JSON string
  return (
    percentileResults.length > 0
      ? JSON.stringify(percentileResults[0])
      : JSON.stringify({
          "0-25%": 0,
          "25-50%": 0,
          "50-75%": 0,
          "75-100%": 0,
        })
  ) as ICommunityBBSAnalyticsKarmaDistribution;
}
