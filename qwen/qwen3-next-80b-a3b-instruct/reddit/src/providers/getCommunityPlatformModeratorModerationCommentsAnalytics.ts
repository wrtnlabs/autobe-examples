import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function getCommunityPlatformModeratorModerationCommentsAnalytics(props: {
  moderator: ModeratorPayload;
}): Promise<ICommunityPlatformCommentVote> {
  // Fetch aggregated moderation analytics using Prisma's query builder
  const result = await MyGlobal.prisma.$queryRaw`
    SELECT
      COUNT(c.id) AS "commentsCount",
      SUM(CASE WHEN r.status = 'pending' THEN 1 ELSE 0 END) AS "underReviewCount",
      SUM(CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END) AS "approvedCount",
      SUM(CASE WHEN r.status = 'dismissed' THEN 1 ELSE 0 END) AS "dismissedCount",
      AVG(EXTRACT(EPOCH FROM (r.updated_at - c.created_at)) / 3600) AS "averageResolutionTimeInHours"
    FROM community_platform_comments c
    JOIN community_platform_comment_reports r ON c.id = r.comment_id
    WHERE r.status != 'pending'
    GROUP BY DATE_TRUNC('day', c.created_at)
    ORDER BY DATE_TRUNC('day', c.created_at) DESC
    LIMIT 1;
  `;
  const row = (result as Array<Record<string, string>>)[0];
  // Handle case where no results are returned
  if (!row) {
    return {
      commentsCount: 0,
      underReviewCount: 0,
      approvedCount: 0,
      dismissedCount: 0,
      averageResolutionTimeInHours: 0,
    };
  }
  // Correctly map and type the fields without 'as' assertions
  return {
    commentsCount: Number(row.commentsCount),
    underReviewCount: Number(row.underReviewCount),
    approvedCount: Number(row.approvedCount),
    dismissedCount: Number(row.dismissedCount),
    averageResolutionTimeInHours: Number(row.averageResolutionTimeInHours),
  };
}
