import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminDashboard(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Calculate 24 hours ago timestamp as ISO string
  const twentyFourHoursAgo = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString();
  // Query system health metrics from last 24 hours
  const metrics =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        collection_timestamp: {
          gte: new Date(twentyFourHoursAgo),
        },
        deleted_at: null,
      },
      orderBy: {
        collection_timestamp: "desc",
      },
      take: 100, // Limit to most recent 100 metrics for performance
    });
  // Find or create dashboard configuration
  let dashboardConfig =
    await MyGlobal.prisma.discussion_board_system_configurations.findFirst({
      where: {
        key: "superadmin.dashboard",
        deleted_at: null,
      },
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  const currentTime = new Date().toISOString();
  if (!dashboardConfig) {
    // Create dashboard configuration with health metrics data
    dashboardConfig =
      await MyGlobal.prisma.discussion_board_system_configurations.create({
        data: {
          id: v4(),
          key: "superadmin.dashboard",
          value: JSON.stringify({
            metrics_count: metrics.length,
            last_updated: currentTime,
            health_indicators: metrics.map((m) => ({
              type: m.metric_type,
              service: m.source_service,
              value: m.metric_value,
              status: m.status,
              timestamp: m.collection_timestamp.toISOString(),
            })),
          }),
          data_type: "json",
          description:
            "Super Administrator Dashboard - System Health Monitoring",
          created_at: new Date(currentTime),
          updated_at: new Date(currentTime),
          deleted_at: null,
        },
        ...DiscussionBoardSystemConfigurationTransformer.select(),
      });
  } else {
    // Update existing dashboard configuration
    dashboardConfig =
      await MyGlobal.prisma.discussion_board_system_configurations.update({
        where: { id: dashboardConfig.id },
        data: {
          value: JSON.stringify({
            metrics_count: metrics.length,
            last_updated: currentTime,
            health_indicators: metrics.map((m) => ({
              type: m.metric_type,
              service: m.source_service,
              value: m.metric_value,
              status: m.status,
              timestamp: m.collection_timestamp.toISOString(),
            })),
          }),
          updated_at: new Date(currentTime),
        },
        ...DiscussionBoardSystemConfigurationTransformer.select(),
      });
  }
  return DiscussionBoardSystemConfigurationTransformer.transform(
    dashboardConfig,
  );
}
