import { IDiscussionBoardSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace DiscussionBoardSystemHealthMetricAtCapacitySummaryTransformer {
  export type Payload = Prisma.discussion_board_system_health_metricsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        metric_type: true,
        metric_value: true,
        unit: true,
        source_service: true,
        collection_timestamp: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        metadata: {
          select: {
            id: true,
            key: true,
            value: true,
          },
        } satisfies Prisma.discussion_board_system_health_metric_metadataFindManyArgs,
      },
    } satisfies Prisma.discussion_board_system_health_metricsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IDiscussionBoardSystemHealthMetric.ICapacitySummary> {
    // This transformer works with individual metric records
    // Aggregation should be handled at the service level
    // Map individual metric to appropriate DTO component
    const mapMetricToDTO = (metric: Payload) => {
      const baseValue = Math.max(0, metric.metric_value);
      switch (metric.metric_type) {
        case "storage_utilization":
          return {
            storage_utilization: {
              current_value: Math.min(100, baseValue),
              unit: "percent" as const,
              alert_status: metric.status as "healthy" | "warning" | "critical",
            },
            performance_metrics: null,
            system_load: null,
          };
        case "cpu_utilization":
        case "memory_usage":
          return {
            storage_utilization: null,
            performance_metrics: {
              cpu_utilization:
                metric.metric_type === "cpu_utilization"
                  ? Math.min(100, baseValue)
                  : 0,
              memory_usage:
                metric.metric_type === "memory_usage"
                  ? Math.min(100, baseValue)
                  : 0,
              response_time: 0,
              throughput: 0,
            },
            system_load: null,
          };
        case "response_time":
        case "throughput":
          return {
            storage_utilization: null,
            performance_metrics: {
              cpu_utilization: 0,
              memory_usage: 0,
              response_time:
                metric.metric_type === "response_time" ? baseValue : 0,
              throughput: metric.metric_type === "throughput" ? baseValue : 0,
            },
            system_load: null,
          };
        case "queue_depth":
        case "active_connections":
          return {
            storage_utilization: null,
            performance_metrics: null,
            system_load: {
              queue_depth:
                metric.metric_type === "queue_depth"
                  ? Math.max(0, Math.round(baseValue))
                  : 0,
              active_connections:
                metric.metric_type === "active_connections"
                  ? Math.max(0, Math.round(baseValue))
                  : 0,
              alert_status: metric.status as "healthy" | "warning" | "critical",
            },
          };
        default:
          return {
            storage_utilization: null,
            performance_metrics: null,
            system_load: null,
          };
      }
    };
    const partialDTO = mapMetricToDTO(input);
    // Return a complete DTO with the transformed metric
    return {
      storage_utilization: partialDTO.storage_utilization || {
        current_value: 0,
        unit: "percent" as const,
        alert_status: "healthy" as const,
      },
      performance_metrics: partialDTO.performance_metrics || {
        cpu_utilization: 0,
        memory_usage: 0,
        response_time: 0,
        throughput: 0,
      },
      system_load: partialDTO.system_load || {
        queue_depth: 0,
        active_connections: 0,
        alert_status: "healthy" as const,
      },
      timestamp: input.collection_timestamp.toISOString(),
    };
  }
}
