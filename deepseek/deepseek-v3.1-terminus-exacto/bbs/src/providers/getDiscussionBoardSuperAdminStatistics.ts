import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminStatistics(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardPerformanceMetric> {
  const now = toISOStringSafe(new Date());
  const thirtyDaysAgo = toISOStringSafe(
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  );
  const twentyFourHoursAgo = toISOStringSafe(
    new Date(Date.now() - 24 * 60 * 60 * 1000),
  );
  const sevenDaysAgo = toISOStringSafe(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  );
  // Get user statistics
  const totalUsers = await MyGlobal.prisma.discussion_board_users.count({
    where: { deleted_at: null },
  });
  const activeUsers = await MyGlobal.prisma.discussion_board_users.count({
    where: {
      deleted_at: null,
      created_at: {
        gte: thirtyDaysAgo,
      },
    },
  });
  // Get article statistics
  const totalArticles = await MyGlobal.prisma.discussion_board_articles.count({
    where: { deleted_at: null },
  });
  const publishedArticles =
    await MyGlobal.prisma.discussion_board_articles.count({
      where: {
        deleted_at: null,
        status: "published",
      },
    });
  // Get comment statistics
  const totalComments = await MyGlobal.prisma.discussion_board_comments.count({
    where: { deleted_at: null },
  });
  // Get section statistics
  const activeSections = await MyGlobal.prisma.discussion_board_sections.count({
    where: {
      deleted_at: null,
      status: "active",
    },
  });
  // Get view statistics
  const viewStats =
    await MyGlobal.prisma.discussion_board_article_view_stats.aggregate({
      _sum: {
        total_view_count: true,
        unique_viewer_count: true,
        total_time_spent_seconds: true,
      },
      _avg: {
        average_time_spent_seconds: true,
      },
    });
  // Get section engagement metrics
  const sectionStats =
    await MyGlobal.prisma.discussion_board_section_statistics.aggregate({
      _sum: {
        view_count: true,
        article_count: true,
        comment_count: true,
      },
    });
  // Get recent performance metrics (last 24 hours)
  const recentPerformanceMetrics =
    await MyGlobal.prisma.discussion_board_performance_metrics.findMany({
      where: {
        collection_timestamp: {
          gte: twentyFourHoursAgo,
        },
      },
      orderBy: { collection_timestamp: "desc" },
      take: 10,
    });
  // Get recent system activities (last 7 days)
  const recentActivities =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: {
        created_at: {
          gte: sevenDaysAgo,
        },
      },
    });
  // Calculate derived metrics
  const avgViewsPerArticle =
    publishedArticles > 0
      ? (viewStats._sum.total_view_count || 0) / publishedArticles
      : 0;
  const engagementRate = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0;
  // Create aggregated statistics DTO
  return {
    id: v4() as string & tags.Format<"uuid">,
    metric_type: "platform_statistics",
    metric_value: engagementRate,
    metric_unit: "percentage",
    source_component: "analytics_aggregator",
    collection_timestamp: now,
    time_range: "instantaneous",
    metadata: JSON.stringify({
      total_users: totalUsers,
      active_users: activeUsers,
      total_articles: totalArticles,
      published_articles: publishedArticles,
      total_comments: totalComments,
      active_sections: activeSections,
      total_views: viewStats._sum.total_view_count || 0,
      unique_viewers: viewStats._sum.unique_viewer_count || 0,
      total_time_spent: viewStats._sum.total_time_spent_seconds || 0,
      avg_time_per_view: viewStats._avg.average_time_spent_seconds || 0,
      section_views: sectionStats._sum.view_count || 0,
      section_articles: sectionStats._sum.article_count || 0,
      section_comments: sectionStats._sum.comment_count || 0,
      avg_views_per_article: avgViewsPerArticle,
      engagement_rate: engagementRate,
      recent_activities: recentActivities,
      performance_metrics_count: recentPerformanceMetrics.length,
    }),
    created_at: now,
    updated_at: now,
  };
}
