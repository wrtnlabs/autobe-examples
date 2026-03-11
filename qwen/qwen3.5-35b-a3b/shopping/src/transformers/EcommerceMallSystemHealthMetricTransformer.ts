import { IEcommerceMallSystemHealthMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSystemHealthMetric";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace EcommerceMallSystemHealthMetricTransformer {
  export type Payload = Prisma.ecommerce_mall_admin_audit_logsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        action_type: true,
        target_entity_type: true,
        target_entity_id: true,
        changes: true,
        previous_values: true,
        new_values: true,
        request_id: true,
        ip_address: true,
        user_agent: true,
        created_at: true,
        updated_at: true,
        admin: true,
      },
    } satisfies Prisma.ecommerce_mall_admin_audit_logsFindManyArgs;
  }
  export async function transform(
    input: Payload[],
  ): Promise<IEcommerceMallSystemHealthMetric> {
    // Helper to determine if action_type indicates an error
    const isErrorActionType = (actionType: string): boolean => {
      const lowerType = actionType.toLowerCase();
      return (
        lowerType.includes("error") ||
        lowerType.includes("fail") ||
        lowerType.includes("reject") ||
        lowerType.includes("cancel")
      );
    };
    // Compute total count
    const totalCount = input.length;
    // Compute error count and group by action_type
    const errorCount = input.filter((entry: Payload) =>
      isErrorActionType(entry.action_type),
    ).length;
    // Group errors by action_type
    const errorCounts: {
      [key: string]: number;
    } = {};
    for (const entry of input) {
      if (isErrorActionType(entry.action_type)) {
        errorCounts[entry.action_type] =
          (errorCounts[entry.action_type] || 0) + 1;
      }
    }
    // Compute error rate
    const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : null;
    // Compute last error timestamps per action_type
    const lastErrorTimestamps: {
      [key: string]: string | null;
    } = {};
    for (const entry of input) {
      if (isErrorActionType(entry.action_type)) {
        const existing = lastErrorTimestamps[entry.action_type];
        const entryDate = new Date(entry.created_at);
        if (!existing || entryDate > new Date(existing)) {
          lastErrorTimestamps[entry.action_type] = toISOStringSafe(
            entry.created_at,
          );
        }
      }
    }
    // Generate critical alerts based on thresholds
    const criticalAlerts: IEcommerceMallSystemHealthMetric.IAlert[] = [];
    if (errorRate !== null) {
      for (const [actionType, count] of Object.entries(errorCounts)) {
        if (count > 0 && totalCount > 0) {
          const actionErrorRate = (count / totalCount) * 100;
          if (actionErrorRate >= 5) {
            criticalAlerts.push({
              alert_type: "error_rate",
              action_type: actionType,
              current_rate: actionErrorRate,
              threshold: 5.0,
              severity: "red",
              message: `Error rate exceeded critical threshold: ${actionErrorRate.toFixed(2)}% (threshold: 5.0%)`,
              timestamp: toISOStringSafe(new Date()),
            });
          } else if (actionErrorRate >= 1) {
            criticalAlerts.push({
              alert_type: "error_rate",
              action_type: actionType,
              current_rate: actionErrorRate,
              threshold: 1.0,
              severity: "yellow",
              message: `Error rate exceeded warning threshold: ${actionErrorRate.toFixed(2)}% (threshold: 1.0%)`,
              timestamp: toISOStringSafe(new Date()),
            });
          }
        }
      }
      // Sort by severity (red first)
      criticalAlerts.sort((a, b) =>
        a.severity === "red" ? -1 : b.severity === "red" ? 1 : 0,
      );
    }
    return {
      error_counts: errorCounts,
      error_rate: errorRate,
      total_count: totalCount,
      error_count: errorCount,
      critical_alerts: criticalAlerts,
      last_error_timestamps: lastErrorTimestamps,
    };
  }
}
