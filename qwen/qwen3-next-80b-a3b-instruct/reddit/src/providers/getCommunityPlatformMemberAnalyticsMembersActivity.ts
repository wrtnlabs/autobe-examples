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
import { ICommunityPlatformMemberActivitySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberActivitySummary";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getCommunityPlatformMemberAnalyticsMembersActivity(props: {
  member: MemberPayload;
}): Promise<ICommunityPlatformMemberActivitySummary> {
  const result = (await MyGlobal.prisma
    .$queryRaw`    SELECT      COALESCE(AVG(session_count), 0) as averageLoginFrequency,      COALESCE(AVG(post_upvote_count), 0) as averagePostEngagementRate,      COALESCE(AVG(comment_upvote_count), 0) as averageCommentEngagementRate,      COALESCE(AVG(community_subscription_count), 0) as averageCommunitySubscriptions    FROM (      SELECT        m.id,        COUNT(DISTINCT ms.id) as session_count,        COUNT(DISTINCT pv.id) as post_upvote_count,        COUNT(DISTINCT cv.id) as comment_upvote_count,        COUNT(DISTINCT cs.id) as community_subscription_count      FROM community_platform_members m      LEFT JOIN community_platform_member_sessions ms ON m.id = ms.member_id AND ms.deleted_at IS NULL      LEFT JOIN community_platform_posts p ON m.id = p.created_by AND p.deleted_at IS NULL      LEFT JOIN community_platform_post_votes pv ON p.id = pv.post_id AND pv.value = 1      LEFT JOIN community_platform_comments c ON m.id = c.created_by AND c.deleted_at IS NULL      LEFT JOIN community_platform_comment_votes cv ON c.id = cv.comment_id AND cv.value = 1      LEFT JOIN community_platform_community_subscriptions cs ON m.id = cs.member_id AND cs.deleted_at IS NULL      WHERE m.deleted_at IS NULL      GROUP BY m.id    ) as member_aggregates  `) as any as Array<{
    averageLoginFrequency: number;
    averagePostEngagementRate: number;
    averageCommentEngagementRate: number;
    averageCommunitySubscriptions: number;
  }>;
  const row = result[0];
  return {
    averageLoginFrequency: row.averageLoginFrequency,
    averagePostEngagementRate: row.averagePostEngagementRate,
    averageCommentEngagementRate: row.averageCommentEngagementRate,
    averageCommunitySubscriptions: row.averageCommunitySubscriptions,
  };
}
