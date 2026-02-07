import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdminDashboardHealth(props: {
  admin: AdminPayload;
}): Promise<IShoppingMallSystematicStatus> {
  // Query current system status
  const currentStatus =
    await MyGlobal.prisma.shopping_mall_systematic_statuses.findFirst({
      orderBy: { last_updated: "desc" },
    });
  // Query recent system logs for error analysis (last 24 hours)
  const oneDayAgo = toISOStringSafe(new Date(Date.now() - 24 * 60 * 60 * 1000));
  const recentLogs =
    await MyGlobal.prisma.shopping_mall_systematic_logs.findMany({
      where: {
        created_at: {
          gte: oneDayAgo as string & tags.Format<"date-time">,
        },
      },
      orderBy: { created_at: "desc" },
      take: 100,
    });
  // Query version information for uptime calculation
  const versions =
    await MyGlobal.prisma.shopping_mall_systematic_versions.findMany({
      orderBy: { created_at: "asc" },
    });
  // Calculate system uptime from first version
  const systemUptime =
    versions.length > 0 ? toISOStringSafe(versions[0].created_at) : null;
  // Calculate error rate from recent logs
  const errorLogs = recentLogs.filter((log) => log.severity === "error");
  const errorRate =
    recentLogs.length > 0 ? errorLogs.length / recentLogs.length : 0;
  // Build health response with all metrics
  return {
    status: currentStatus?.current_status ?? "unknown",
    uptime: systemUptime,
    errorRate: errorRate,
    recentErrorCount: errorLogs.length,
    totalRequests: currentStatus?.active_connections ?? 0,
    averageResponseTime: currentStatus?.avg_response_time_ms ?? 0,
    databaseConnection: {
      status: currentStatus?.current_status ?? "unknown",
      responseTime: currentStatus?.avg_response_time_ms ?? null,
    },
    cacheStatus: {
      status: currentStatus?.current_status ?? "unknown",
      hitRate: currentStatus?.uptime_percentage ?? 0,
    },
    queueStatus: {
      pendingJobs: currentStatus?.queue_depth ?? 0,
      processed24h: currentStatus?.active_connections ?? 0,
    },
    serviceHealth: {
      apiService: currentStatus?.current_status ?? "unknown",
      workerService: currentStatus?.current_status ?? "unknown",
      cronService: currentStatus?.current_status ?? "unknown",
    },
    resourceUtilization: {
      cpuUsage: currentStatus?.cpu_utilization_percentage ?? 0,
      memoryUsage: currentStatus?.memory_utilization_percentage ?? 0,
      diskUsage: currentStatus?.disk_usage_percentage ?? 0,
    },
    recentErrors: recentLogs
      .filter((log) => log.severity === "error")
      .map((log) => ({
        timestamp: toISOStringSafe(log.created_at),
        level: log.severity,
        message: log.message,
        context: log.context,
      })),
  };
}
