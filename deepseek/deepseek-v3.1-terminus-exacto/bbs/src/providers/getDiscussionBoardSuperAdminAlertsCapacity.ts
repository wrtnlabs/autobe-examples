import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
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

export async function getDiscussionBoardSuperAdminAlertsCapacity(props: {
  superAdmin: SuperadminPayload;
}): Promise<IDiscussionBoardSystemHealthMetric.ICapacitySummary> {
  // Calculate timestamp for one hour ago in ISO format
  const oneHourAgoIso = toISOStringSafe(new Date(Date.now() - 60 * 60 * 1000));
  const metrics =
    await MyGlobal.prisma.discussion_board_system_health_metrics.findMany({
      where: {
        metric_type: {
          in: [
            "storage_utilization",
            "cpu_utilization",
            "memory_usage",
            "response_time",
            "throughput",
            "queue_depth",
            "active_connections",
          ],
        },
        collection_timestamp: {
          gte: oneHourAgoIso,
        },
        deleted_at: null,
      },
      orderBy: {
        collection_timestamp: "desc",
      },
    });
  if (metrics.length === 0) {
    // Return default values if no metrics found
    return {
      storage_utilization: {
        current_value: 0,
        unit: "percent",
        alert_status: "healthy",
      },
      performance_metrics: {
        cpu_utilization: 0,
        memory_usage: 0,
        response_time: 0,
        throughput: 0,
      },
      system_load: {
        queue_depth: 0,
        active_connections: 0,
        alert_status: "healthy",
      },
      timestamp: toISOStringSafe(new Date()),
    };
  }
  // Group metrics by type
  const groupedMetrics = metrics.reduce(
    (acc: Record<string, typeof metrics>, metric) => {
      const key = metric.metric_type;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(metric);
      return acc;
    },
    {} as Record<string, typeof metrics>,
  );
  // Calculate weighted averages based on recency
  const calculateWeightedAverage = (inputMetrics: typeof metrics) => {
    if (inputMetrics.length === 0) return 0;
    const now = Date.now();
    const totalWeight = inputMetrics.reduce((sum: number, metric) => {
      const age = now - new Date(metric.collection_timestamp).getTime();
      const weight = Math.max(0, 1 - age / (60 * 60 * 1000));
      return sum + weight;
    }, 0);
    if (totalWeight === 0) {
      return (
        inputMetrics.reduce(
          (sum: number, metric) => sum + metric.metric_value,
          0,
        ) / inputMetrics.length
      );
    }
    return (
      inputMetrics.reduce((sum: number, metric) => {
        const age = now - new Date(metric.collection_timestamp).getTime();
        const weight = Math.max(0, 1 - age / (60 * 60 * 1000));
        return sum + metric.metric_value * weight;
      }, 0) / totalWeight
    );
  };
  // Calculate alert status based on thresholds
  const getAlertStatus = (value: number, maxValue: number = 100) => {
    const percentage = (value / maxValue) * 100;
    if (percentage >= 85) return "critical";
    if (percentage >= 70) return "warning";
    return "healthy";
  };
  const storageUtilization = calculateWeightedAverage(
    groupedMetrics["storage_utilization"] || [],
  );
  const cpuUtilization = calculateWeightedAverage(
    groupedMetrics["cpu_utilization"] || [],
  );
  const memoryUsage = calculateWeightedAverage(
    groupedMetrics["memory_usage"] || [],
  );
  const responseTime = calculateWeightedAverage(
    groupedMetrics["response_time"] || [],
  );
  const throughput = calculateWeightedAverage(
    groupedMetrics["throughput"] || [],
  );
  const queueDepth = calculateWeightedAverage(
    groupedMetrics["queue_depth"] || [],
  );
  const activeConnections = calculateWeightedAverage(
    groupedMetrics["active_connections"] || [],
  );
  // Get the latest timestamp
  const latestTimestamp = metrics[0].collection_timestamp;
  return {
    storage_utilization: {
      current_value: Math.min(100, Math.max(0, storageUtilization)),
      unit: "percent",
      alert_status: getAlertStatus(storageUtilization),
    },
    performance_metrics: {
      cpu_utilization: Math.min(100, Math.max(0, cpuUtilization)),
      memory_usage: Math.min(100, Math.max(0, memoryUsage)),
      response_time: Math.max(0, responseTime),
      throughput: Math.max(0, throughput),
    },
    system_load: {
      queue_depth: Math.max(0, Math.round(queueDepth)),
      active_connections: Math.max(0, Math.round(activeConnections)),
      alert_status: getAlertStatus(
        Math.max(queueDepth, activeConnections),
        Math.max(queueDepth, activeConnections, 1),
      ),
    },
    timestamp:
      typeof latestTimestamp === "string"
        ? latestTimestamp
        : toISOStringSafe(latestTimestamp),
  };
}
