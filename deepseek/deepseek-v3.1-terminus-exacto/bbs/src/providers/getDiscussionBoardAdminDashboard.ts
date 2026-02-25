import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminDashboard(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Verify admin exists and is active
  await MyGlobal.prisma.discussion_board_admins.findFirstOrThrow({
    where: {
      id: props.admin.id,
      deleted_at: null,
    },
  });
  // Calculate date ranges using toISOStringSafe()
  const now = Date.now();
  const oneWeekAgoMs = now - 7 * 24 * 60 * 60 * 1000;
  const oneMonthAgoMs = now - 30 * 24 * 60 * 60 * 1000;
  const oneWeekAgo = toISOStringSafe(new Date(oneWeekAgoMs));
  const oneMonthAgo = toISOStringSafe(new Date(oneMonthAgoMs));
  const currentTime = toISOStringSafe(new Date(now));
  // Execute parallel queries for dashboard statistics
  const [totalUsers, totalArticles, totalComments, totalSections] =
    await Promise.all([
      MyGlobal.prisma.discussion_board_users.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_articles.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_comments.count({
        where: { deleted_at: null },
      }),
      MyGlobal.prisma.discussion_board_sections.count({
        where: { deleted_at: null },
      }),
    ]);
  // Get recent system activities (last 7 days)
  const recentActivities =
    await MyGlobal.prisma.discussion_board_system_activities.count({
      where: {
        created_at: { gte: oneWeekAgo },
      },
    });
  // Get recent view statistics (last 7 days) - fixed column name
  const recentViews =
    await MyGlobal.prisma.discussion_board_article_view_stat_events.count({
      where: {
        created_at: { gte: oneWeekAgo },
      },
    });
  // Get moderation statistics (last 30 days)
  const moderationActions =
    await MyGlobal.prisma.discussion_board_moderation_logs.count({
      where: {
        created_at: { gte: oneMonthAgo },
      },
    });
  // Create dashboard statistics object
  const dashboardStats = {
    total_users: totalUsers,
    total_articles: totalArticles,
    total_comments: totalComments,
    total_sections: totalSections,
    recent_activities: recentActivities,
    recent_views: recentViews,
    recent_moderation: moderationActions,
    generated_at: currentTime,
  };
  // Create a proper system configuration entry
  const configId = v4();
  const config = {
    id: configId,
    config_key: "admin_dashboard_stats",
    config_value: JSON.stringify(dashboardStats),
    data_type: "json" as const,
    description: "Administrative dashboard statistics and metrics",
    category: "administration",
    is_sensitive: false,
    performanceMetrics: [], // Added to satisfy transformer interface
    created_at: currentTime,
    updated_at: currentTime,
    deleted_at: null,
  };
  // Use the transformer to ensure proper type conversion
  return DiscussionBoardSystemConfigurationTransformer.transform({
    ...config,
    created_at: new Date(config.created_at),
    updated_at: new Date(config.updated_at),
    deleted_at: config.deleted_at ? new Date(config.deleted_at) : null,
  });
}
