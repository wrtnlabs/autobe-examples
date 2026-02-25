import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserStats(props: {
  user: UserPayload;
}): Promise<IDiscussionBoardPerformanceMetric> {
  // Get current timestamp as ISO string
  const currentTimestamp = toISOStringSafe(new Date());
  // Aggregate user statistics - total users
  const totalUsers = await MyGlobal.prisma.discussion_board_users.count({
    where: { deleted_at: null },
  });
  // Aggregate user statistics - active users (users with activity in last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const activeUsers =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: {
        activity_type: "user_login",
        created_at: { gte: thirtyDaysAgo },
      },
    });
  // Aggregate content statistics
  const totalArticles = await MyGlobal.prisma.discussion_board_articles.count({
    where: { deleted_at: null },
  });
  const totalComments = await MyGlobal.prisma.discussion_board_comments.count({
    where: { deleted_at: null },
  });
  // Aggregate view statistics
  const viewStats =
    await MyGlobal.prisma.discussion_board_article_view_stats.aggregate({
      _sum: {
        total_view_count: true,
        unique_viewer_count: true,
      },
      _avg: {
        average_time_spent_seconds: true,
      },
    });
  // Create a comprehensive platform statistics metadata
  const metadata = JSON.stringify({
    total_users: totalUsers,
    active_users_30d: activeUsers,
    total_articles: totalArticles,
    total_comments: totalComments,
    total_views: (viewStats._sum?.total_view_count ?? 0) || 0,
    unique_viewers: (viewStats._sum?.unique_viewer_count ?? 0) || 0,
    average_engagement_time:
      (viewStats._avg?.average_time_spent_seconds ?? 0) || 0,
    engagement_ratio: totalArticles > 0 ? totalComments / totalArticles : 0,
    calculation_period: "lifetime",
    data_freshness: currentTimestamp,
  });
  // Create the aggregated platform statistics metric
  const platformMetric =
    await MyGlobal.prisma.discussion_board_performance_metrics.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        metric_type: "platform_statistics_summary",
        metric_value: totalUsers + totalArticles + totalComments,
        metric_unit: "composite_score",
        source_component: "platform_statistics_aggregator",
        collection_timestamp: new Date(currentTimestamp),
        time_range: "instantaneous",
        metadata: metadata,
        created_at: new Date(currentTimestamp),
        updated_at: new Date(currentTimestamp),
      },
      ...DiscussionBoardPerformanceMetricTransformer.select(),
    });
  return await DiscussionBoardPerformanceMetricTransformer.transform(
    platformMetric,
  );
}
