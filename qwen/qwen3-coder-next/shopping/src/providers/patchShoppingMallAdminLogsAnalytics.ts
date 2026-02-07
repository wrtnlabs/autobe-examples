import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSystematicConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystematicConfig";
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

export async function patchShoppingMallAdminLogsAnalytics(props: {
  admin: AdminPayload;
  body: IShoppingMallSystematicConfig.IRequest;
}): Promise<IShoppingMallSystematicConfig.IResponse> {
  // Define time range (default: last 7 days)
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const endTime = now.toISOString();
  const startTime = sevenDaysAgo.toISOString();
  try {
    // Query systematic logs for time range with aggregation
    const logs = await MyGlobal.prisma.shopping_mall_systematic_logs.findMany({
      where: {
        created_at: {
          gte: startTime,
          lte: endTime,
        },
      },
      select: {
        severity: true,
        created_at: true,
        duration_ms: true,
        status_code: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
    // Query systematic statuses for current metrics
    const statuses =
      await MyGlobal.prisma.shopping_mall_systematic_statuses.findMany({
        select: {
          current_status: true,
          uptime_percentage: true,
          avg_response_time_ms: true,
          error_rate_percentage: true,
          cpu_utilization_percentage: true,
          memory_utilization_percentage: true,
          disk_usage_percentage: true,
          active_connections: true,
          queue_depth: true,
          last_updated: true,
        },
      });
    // Calculate time-series data from logs
    const timeSeriesMap = new Map<
      string,
      {
        timestamp: string & tags.Format<"date-time">;
        error_count: number;
        warning_count: number;
        info_count: number;
        debug_count: number;
        total_requests: number;
        total_duration_ms: number;
      }
    >();
    for (const log of logs) {
      const timestamp = log.created_at;
      // Extract hour for time series grouping
      const date = new Date(timestamp);
      const hourKey = date
        .toISOString()
        .replace(/:[0-9]{2}\.[0-9]{3}Z$/, ":00.000Z");
      if (!timeSeriesMap.has(hourKey)) {
        timeSeriesMap.set(hourKey, {
          timestamp: hourKey as string & tags.Format<"date-time">,
          error_count: 0,
          warning_count: 0,
          info_count: 0,
          debug_count: 0,
          total_requests: 0,
          total_duration_ms: 0,
        });
      }
      const entry = timeSeriesMap.get(hourKey)!;
      switch (log.severity) {
        case "error":
          entry.error_count++;
          break;
        case "warning":
          entry.warning_count++;
          break;
        case "info":
          entry.info_count++;
          break;
        case "debug":
          entry.debug_count++;
          break;
      }
      if (log.duration_ms !== null) {
        entry.total_duration_ms += log.duration_ms;
      }
      if (log.status_code !== null) {
        entry.total_requests++;
      }
    }
    const timeSeriesData = Array.from(timeSeriesMap.values()).sort((a, b) =>
      b.timestamp.localeCompare(a.timestamp),
    );
    // Calculate current status metrics from statuses
    let current_errors = 0;
    let current_warnings = 0;
    let current_healthy = 0;
    let total_uptime = 0;
    let uptime_count = 0;
    let total_response_time = 0;
    let response_time_count = 0;
    let total_error_rate = 0;
    let error_rate_count = 0;
    let total_cpu = 0;
    let cpu_count = 0;
    let total_memory = 0;
    let memory_count = 0;
    let total_disk = 0;
    let disk_count = 0;
    let total_connections = 0;
    let connection_count = 0;
    let total_queue_depth = 0;
    let queue_depth_count = 0;
    for (const status of statuses) {
      switch (status.current_status) {
        case "error":
          current_errors++;
          break;
        case "warning":
          current_warnings++;
          break;
        case "healthy":
        case "degraded":
          current_healthy++;
          break;
      }
      if (status.uptime_percentage !== null) {
        total_uptime += status.uptime_percentage;
        uptime_count++;
      }
      if (status.avg_response_time_ms !== null) {
        total_response_time += status.avg_response_time_ms;
        response_time_count++;
      }
      if (status.error_rate_percentage !== null) {
        total_error_rate += status.error_rate_percentage;
        error_rate_count++;
      }
      if (status.cpu_utilization_percentage !== null) {
        total_cpu += status.cpu_utilization_percentage;
        cpu_count++;
      }
      if (status.memory_utilization_percentage !== null) {
        total_memory += status.memory_utilization_percentage;
        memory_count++;
      }
      if (status.disk_usage_percentage !== null) {
        total_disk += status.disk_usage_percentage;
        disk_count++;
      }
      if (status.active_connections !== null) {
        total_connections += status.active_connections;
        connection_count++;
      }
      if (status.queue_depth !== null) {
        total_queue_depth += status.queue_depth;
        queue_depth_count++;
      }
    }
    // Calculate averages for resource utilization
    const uptime_percentage =
      uptime_count > 0 ? ((total_uptime / uptime_count) as number) : null;
    const avg_response_time_ms =
      response_time_count > 0
        ? ((total_response_time / response_time_count) as number)
        : null;
    const error_rate_percentage =
      error_rate_count > 0
        ? ((total_error_rate / error_rate_count) as number)
        : null;
    const cpu_utilization_percentage =
      cpu_count > 0 ? ((total_cpu / cpu_count) as number) : null;
    const memory_utilization_percentage =
      memory_count > 0 ? ((total_memory / memory_count) as number) : null;
    const disk_usage_percentage =
      disk_count > 0 ? ((total_disk / disk_count) as number) : null;
    const active_connections =
      connection_count > 0
        ? ((total_connections / connection_count) as number)
        : null;
    const queue_depth =
      queue_depth_count > 0
        ? ((total_queue_depth / queue_depth_count) as number)
        : null;
    // Build error summary by hour
    const errorSummary: Record<
      string,
      Array<{
        timestamp: string & tags.Format<"date-time">;
        severity: string;
        message: string;
      }>
    > = {};
    for (const log of logs) {
      if (log.severity === "error") {
        const timestamp = log.created_at;
        const date = new Date(timestamp);
        const hourKey = date
          .toISOString()
          .replace(/:[0-9]{2}\.[0-9]{3}Z$/, ":00.000Z") as string &
          tags.Format<"date-time">;
        if (!errorSummary[hourKey]) {
          errorSummary[hourKey] = [];
        }
        errorSummary[hourKey].push({
          timestamp: hourKey,
          severity: log.severity,
          message: "Error message not available",
        });
      }
    }
    return {
      summary: {
        total_logs: logs.length,
        total_statuses: statuses.length,
        error_count: logs.filter((log) => log.severity === "error").length,
        warning_count: logs.filter((log) => log.severity === "warning").length,
        info_count: logs.filter((log) => log.severity === "info").length,
        debug_count: logs.filter((log) => log.severity === "debug").length,
      },
      uptime: {
        percentage: uptime_percentage,
        hours_monitored: 168, // 7 days
        status_counts: {
          healthy: current_healthy,
          warning: current_warnings,
          error: current_errors,
        },
      },
      response_time: {
        avg_ms: avg_response_time_ms,
        max_ms: null,
        min_ms: null,
      },
      error_rate: {
        percentage: error_rate_percentage,
        error_summary: errorSummary,
      },
      resource_utilization: {
        cpu: {
          percentage: cpu_utilization_percentage,
          peak: null,
        },
        memory: {
          percentage: memory_utilization_percentage,
          peak: null,
        },
        disk: {
          percentage: disk_usage_percentage,
          peak: null,
        },
      },
      system_capacity: {
        active_connections: active_connections,
        queue_depth: queue_depth,
      },
      time_series: timeSeriesData,
    };
  } catch (error) {
    console.error("Error in analytics operation:", error);
    throw new HttpException("Failed to retrieve analytics data", 500);
  }
}
