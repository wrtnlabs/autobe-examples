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

export async function getDiscussionBoardAdminSystemOverview(props: {
  admin: AdminPayload;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Verify admin exists and is active
  const adminRecord =
    await MyGlobal.prisma.discussion_board_admins.findUniqueOrThrow({
      where: { id: props.admin.id, deleted_at: null },
    });
  // Query counts from all necessary tables
  const [
    usersCount,
    articlesCount,
    commentsCount,
    sectionsCount,
    adminsCount,
    superAdminsCount,
  ] = await Promise.all([
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
    MyGlobal.prisma.discussion_board_admins.count({
      where: { deleted_at: null },
    }),
    MyGlobal.prisma.discussion_board_super_admins.count({
      where: { deleted_at: null },
    }),
  ]);
  // Get earliest system configuration for uptime calculation
  const earliestConfig =
    await MyGlobal.prisma.discussion_board_system_configurations.findFirst({
      orderBy: { created_at: "asc" } as const,
      where: { deleted_at: null },
    });
  const currentTime = new Date();
  const uptimeSeconds = earliestConfig
    ? Math.floor(
        (currentTime.getTime() - earliestConfig.created_at.getTime()) / 1000,
      )
    : 0;
  // Create a system configuration entity with the overview statistics including required performanceMetrics
  const overviewData = {
    id: v4(),
    config_key: "system_overview_live",
    config_value: JSON.stringify({
      users_total: usersCount,
      articles_total: articlesCount,
      comments_total: commentsCount,
      sections_total: sectionsCount,
      admins_total: adminsCount,
      super_admins_total: superAdminsCount,
      platform_uptime_seconds: uptimeSeconds,
      generated_at: toISOStringSafe(currentTime),
    }),
    data_type: "json" as const,
    description: "Live system overview statistics generated on demand",
    category: "system_monitoring",
    is_sensitive: false,
    created_at: currentTime,
    updated_at: currentTime,
    deleted_at: null,
    performanceMetrics: [
      { id: v4(), metric_value: usersCount },
      { id: v4(), metric_value: articlesCount },
      { id: v4(), metric_value: commentsCount },
      { id: v4(), metric_value: sectionsCount },
      { id: v4(), metric_value: adminsCount },
      { id: v4(), metric_value: superAdminsCount },
      { id: v4(), metric_value: uptimeSeconds },
    ],
  };
  // Transform using the available transformer
  return DiscussionBoardSystemConfigurationTransformer.transform(overviewData);
}
