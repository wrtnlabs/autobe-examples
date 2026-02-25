import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
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

export async function getRedditCloneMemberAnalyticsPostsNew(props: {
  member: MemberPayload;
}): Promise<IRedditCloneContentPost.INewPost> {
  // Use default time range (last 30 days) - in production would come from query params
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  // Convert to proper ISO string format
  const startDateStr = startDate.toISOString();
  const endDateStr = endDate.toISOString();
  // Query posts by community using typed Prisma API
  const postsByCommunityResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      communityId: string;
      communityName: string;
      postCount: number;
    }>
  >`
    SELECT 
      c.id as communityId,
      c.name as communityName,
      COUNT(p.id) as postCount
    FROM reddit_clone_content_posts p
    JOIN reddit_clone_communities c ON p.community_id = c.id
    WHERE p.created_at >= '${startDate.toISOString()}'::timestamptz
      AND p.created_at <= '${endDate.toISOString()}'::timestamptz
      AND p.deleted_at IS NULL
    GROUP BY c.id, c.name
    ORDER BY postCount DESC
  `;
  // Calculate total posts
  const totalPosts = postsByCommunityResult.reduce(
    (sum, item) => sum + Number(item.postCount),
    0,
  );
  // Get previous period data for rate calculation
  const prevEndDate = startDate;
  const prevStartDate = new Date(
    prevEndDate.getTime() - 30 * 24 * 60 * 60 * 1000,
  );
  const prevPeriodResult = await MyGlobal.prisma.$queryRaw<
    Array<{
      count: number;
    }>
  >`
    SELECT COUNT(*) as count
    FROM reddit_clone_content_posts
    WHERE created_at >= '${prevStartDate.toISOString()}'::timestamptz
      AND created_at < '${prevEndDate.toISOString()}'::timestamptz
      AND deleted_at IS NULL
  `;
  const previousPeriodCount = Number(prevPeriodResult[0]?.count || 0);
  const currentPeriodCount = totalPosts;
  // Calculate metrics
  const absolute_growth = currentPeriodCount - previousPeriodCount;
  const percentage_change =
    previousPeriodCount > 0
      ? ((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100
      : 0;
  const growth_rate =
    previousPeriodCount > 0 ? currentPeriodCount / previousPeriodCount : 0;
  return {
    type: "new",
    period: {
      start_date: startDateStr as string & tags.Format<"date-time">,
      end_date: endDateStr as string & tags.Format<"date-time">,
      comparison: null,
    },
    totalPosts: totalPosts as number & tags.Type<"int32">,
    postsByCommunity: postsByCommunityResult.map((item) => ({
      communityId: item.communityId,
      communityName: item.communityName,
      postCount: item.postCount as number & tags.Type<"int32">,
    })),
    creationRate: {
      absolute_growth: absolute_growth as number & tags.Type<"int32">,
      percentage_change,
      current_period_count: currentPeriodCount as number & tags.Type<"int32">,
      previous_period_count: previousPeriodCount as number & tags.Type<"int32">,
      growth_rate,
    },
    trends: "calculated",
  };
}
