import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { UserPayload } from "../decorators/payload/UserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardUserStatistics(props: {
  user: UserPayload;
}): Promise<IDiscussionBoardPerformanceMetric> {
  // Query user statistics
  const activeUsersCount = await MyGlobal.prisma.discussion_board_users.count({
    where: { deleted_at: null },
  });
  const totalUsersCount = await MyGlobal.prisma.discussion_board_users.count();
  // Query article statistics
  const publishedArticlesCount =
    await MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        status: "published",
      },
    });
  const totalArticlesCount =
    await MyGlobal.prisma.discussion_board_articles.count({
      where: { deleted_at: null },
    });
  // Query comment statistics
  const totalCommentsCount =
    await MyGlobal.prisma.discussion_board_comments.count({
      where: { deleted_at: null },
    });
  // Query section statistics
  const activeSectionsCount =
    await MyGlobal.prisma.discussion_board_sections.count({
      where: {
        deleted_at: null,
        status: "active",
      },
    });
  // Query view statistics
  const viewStats =
    await MyGlobal.prisma.discussion_board_article_view_stats.findMany({
      select: {
        total_view_count: true,
        unique_viewer_count: true,
        total_time_spent_seconds: true,
      },
    });
  // Query section engagement metrics
  const sectionStats =
    await MyGlobal.prisma.discussion_board_section_statistics.findMany({
      select: {
        view_count: true,
        article_count: true,
        comment_count: true,
      },
    });
  // Query recent platform activities (last 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivitiesCount =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: {
        created_at: {
          gte: twentyFourHoursAgo,
        },
      },
    });
  // Calculate derived metrics
  const totalViews = viewStats.reduce(
    (sum, stat) => sum + stat.total_view_count,
    0,
  );
  const totalUniqueViewers = viewStats.reduce(
    (sum, stat) => sum + stat.unique_viewer_count,
    0,
  );
  const totalTimeSpent = viewStats.reduce(
    (sum, stat) => sum + stat.total_time_spent_seconds,
    0,
  );
  const totalSectionViews = sectionStats.reduce(
    (sum, stat) => sum + stat.view_count,
    0,
  );
  const totalSectionArticles = sectionStats.reduce(
    (sum, stat) => sum + stat.article_count,
    0,
  );
  const totalSectionComments = sectionStats.reduce(
    (sum, stat) => sum + stat.comment_count,
    0,
  );
  const averageViewsPerArticle =
    publishedArticlesCount > 0 ? totalViews / publishedArticlesCount : 0;
  const engagementRate =
    totalUniqueViewers > 0
      ? (totalCommentsCount / totalUniqueViewers) * 100
      : 0;
  // Create synthetic performance metric representing platform statistics
  const now = toISOStringSafe(new Date());
  return {
    id: v4(),
    metric_type: "platform_statistics",
    metric_value: 100, // Overall platform health score
    metric_unit: "percentage",
    source_component: "analytics_aggregator",
    collection_timestamp: now,
    time_range: "instantaneous",
    metadata: JSON.stringify({
      user_statistics: {
        active_users: activeUsersCount,
        total_users: totalUsersCount,
      },
      content_statistics: {
        published_articles: publishedArticlesCount,
        total_articles: totalArticlesCount,
        total_comments: totalCommentsCount,
      },
      section_statistics: {
        active_sections: activeSectionsCount,
        total_section_views: totalSectionViews,
        total_section_articles: totalSectionArticles,
        total_section_comments: totalSectionComments,
      },
      engagement_metrics: {
        total_views: totalViews,
        total_unique_viewers: totalUniqueViewers,
        total_time_spent_seconds: totalTimeSpent,
        average_views_per_article: averageViewsPerArticle,
        engagement_rate_percentage: engagementRate,
      },
      activity_statistics: {
        recent_activities_last_24h: recentActivitiesCount,
      },
    }),
    created_at: now,
    updated_at: now,
  };
}
