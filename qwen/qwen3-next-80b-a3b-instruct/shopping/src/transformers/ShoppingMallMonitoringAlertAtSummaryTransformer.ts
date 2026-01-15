import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallMonitoringAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlert";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMonitoringAlertAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_monitoring_alertsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        alert_type: true,
        severity: true,
        message: true,
        entity_type: true,
        detected_at: true,
        resolved_at: true,
        admin: true,
        entity_id: true,
        metadata: true,
        created_at: true,
        updated_at: true,
      },
    } satisfies Prisma.shopping_mall_monitoring_alertsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMonitoringAlert.ISummary> {
    return {
      alert_id: input.id,
      severity: input.severity as "critical" | "high" | "medium" | "low",
      event_type: input.alert_type,
      message: input.message,
      source_component: input.entity_type,
      triggered_at: input.detected_at.toISOString(),
      resolved_at: input.resolved_at?.toISOString() ?? null,
    };
  }
}
