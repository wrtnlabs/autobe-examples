import { IDiscussionBoardPerformanceMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPerformanceMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardPerformanceMetricTransformer } from "../transformers/DiscussionBoardPerformanceMetricTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminStatistics(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardPerformanceMetric> {
  const currentTimestamp = toISOStringSafe(new Date());
  // Query statistics sequentially for better error handling
  const userCount = await MyGlobal.prisma.discussion_board_users.count({
    where: { deleted_at: null },
  });
  const articleCount = await MyGlobal.prisma.discussion_board_articles.count({
    where: { deleted_at: null },
  });
  const commentCount = await MyGlobal.prisma.discussion_board_comments.count({
    where: { deleted_at: null },
  });
  const sectionCount = await MyGlobal.prisma.discussion_board_sections.count({
    where: { deleted_at: null },
  });
  const viewStats =
    await MyGlobal.prisma.discussion_board_article_view_stats.aggregate({
      _sum: {
        total_view_count: true,
        unique_viewer_count: true,
      },
    });
  const sectionStats =
    await MyGlobal.prisma.discussion_board_section_statistics.aggregate({
      _avg: {
        view_count: true,
        comment_count: true,
      },
    });
  const recentActivityCount =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });
  // Calculate derived metrics
  const totalViews = viewStats._sum?.total_view_count ?? 0;
  const uniqueViewers = viewStats._sum?.unique_viewer_count ?? 0;
  const avgViewsPerArticle = articleCount > 0 ? totalViews / articleCount : 0;
  const engagementRate = userCount > 0 ? (uniqueViewers / userCount) * 100 : 0;
  // Create a performance metric record that represents platform statistics
  const metricRecord = {
    id: v4(),
    metric_type: "platform_statistics",
    metric_value: 100, // Overall platform health score
    metric_unit: "percentage",
    source_component: "admin_dashboard",
    collection_timestamp: new Date(), // Changed from toISOStringSafe to Date
    time_range: "instantaneous",
    metadata: JSON.stringify({
      user_statistics: { total_users: userCount, active_users: uniqueViewers },
      content_statistics: {
        total_articles: articleCount,
        total_comments: commentCount,
        total_sections: sectionCount,
      },
      engagement_statistics: {
        total_views: totalViews,
        avg_views_per_article: avgViewsPerArticle,
        engagement_rate: engagementRate,
      },
      section_statistics: {
        avg_section_views: sectionStats._avg?.view_count ?? 0,
        avg_section_content: sectionStats._avg?.comment_count ?? 0,
      },
      activity_statistics: { recent_activities: recentActivityCount },
    }),
    created_at: new Date(),
    updated_at: new Date(),
    discussion_board_system_configuration_id: null,
    systemConfiguration: null,
  };
  return await DiscussionBoardPerformanceMetricTransformer.transform(
    metricRecord,
  );
}
