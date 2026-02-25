import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSystemOverview(props: {
  superAdmin: SuperAdminPayload;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Execute all count queries in parallel for performance
  const [
    totalUsers,
    totalArticles,
    totalComments,
    totalSections,
    totalAdmins,
    totalSuperAdmins,
    recentActivities,
    earliestConfig,
  ] = await Promise.all([
    // Count users
    MyGlobal.prisma.discussion_board_users.count({
      where: { deleted_at: null },
    }),
    // Count articles
    MyGlobal.prisma.discussion_board_articles.count({
      where: { deleted_at: null },
    }),
    // Count comments
    MyGlobal.prisma.discussion_board_comments.count({
      where: { deleted_at: null },
    }),
    // Count sections
    MyGlobal.prisma.discussion_board_sections.count({
      where: { deleted_at: null },
    }),
    // Count admins
    MyGlobal.prisma.discussion_board_admins.count({
      where: { deleted_at: null },
    }),
    // Count super admins
    MyGlobal.prisma.discussion_board_super_admins.count({
      where: { deleted_at: null },
    }),
    // Count recent activities (last 24 hours)
    MyGlobal.prisma.discussion_board_system_activities.count({
      where: {
        created_at: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    }),
    // Get earliest system configuration for uptime calculation
    MyGlobal.prisma.discussion_board_system_configurations.findFirst({
      orderBy: { created_at: "asc" },
      select: { created_at: true },
    }),
  ]);
  // Calculate platform uptime based on earliest config
  const platformUptimeMs = earliestConfig
    ? Date.now() - earliestConfig.created_at.getTime()
    : 0;
  // Create overview stats object
  const overviewStats = {
    totalUsers,
    totalArticles,
    totalComments,
    totalSections,
    totalAdmins,
    totalSuperAdmins,
    recentActivities24h: recentActivities,
    platformUptimeDays: Math.floor(platformUptimeMs / (1000 * 60 * 60 * 24)),
  };
  // Use the imported v4 function directly without redefining it
  const now = new Date();
  return {
    id: v4() as string & tags.Format<"uuid">,
    config_key: "system_overview",
    config_value: JSON.stringify(overviewStats),
    data_type: "json",
    description:
      "Comprehensive system overview statistics including user counts, content metrics, and platform performance indicators",
    category: "system_analytics",
    is_sensitive: false,
    created_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
    updated_at: toISOStringSafe(now) as string & tags.Format<"date-time">,
    deleted_at: null,
  };
}
