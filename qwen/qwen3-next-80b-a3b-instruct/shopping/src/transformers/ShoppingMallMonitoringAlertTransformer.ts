import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallMonitoringAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlert";
import { IShoppingMallMonitoringAlertDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertDetails";
import { IShoppingMallMonitoringAlertMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertMetadata";
import { IShoppingMallMonitoringAlertAdditionalProperties } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertAdditionalProperties";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMonitoringAlertTransformer {
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
        entity_id: true,
        detected_at: true,
        resolved_at: true,
        metadata: true,
        created_at: true,
        updated_at: true,
        admin: true,
      },
    } satisfies Prisma.shopping_mall_monitoring_alertsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallMonitoringAlert> {
    // Construct details from alert's own fields, not using ShoppingMallMonitoringAlertDetailsTransformer
    // because that transformer expects a different input format (full alert object)
    // We construct a minimal details object using available fields
    const details = {
      alertId: input.id,
      level: input.alert_type satisfies string as
        | "info"
        | "warning"
        | "critical",
      message: input.message,
      createdAt: toISOStringSafe(input.detected_at),
      resolvedAt: input.resolved_at
        ? toISOStringSafe(input.resolved_at)
        : undefined,
      monitorKey: input.entity_type, // map entity_type to monitorKey
      metadata: input.metadata,
    };
    return {
      id: input.id,
      type: input.alert_type satisfies string as
        | "info"
        | "warning"
        | "critical",
      severity: input.severity satisfies string as
        | "medium"
        | "high"
        | "low"
        | "critical",
      status: "active",
      source: input.entity_type,
      message: input.message,
      details: details, // Correctly constructed object
      detected_at: toISOStringSafe(input.detected_at),
      created_by: input.id, // Use id (UUID) instead of created_at (Date)
      resolved_by: input.resolved_at ? input.admin?.id : undefined,
      resolution_notes: input.resolved_at
        ? "Resolved by system action"
        : undefined,
      suppressed_reason: undefined,
      related_alerts: undefined,
      correlation_id: input.entity_id ?? undefined, // Convert null to undefined
      tags: undefined,
      additional_properties: undefined,
      client_ip: undefined,
      user_agent: undefined,
      http_method: undefined,
      http_status_code: undefined,
      url_path: undefined,
      error_code: undefined,
      corrupted_data: undefined,
      impact_duration_minutes: input.updated_at
        ? Math.floor(
            (input.updated_at.getTime() - input.detected_at.getTime()) / 60000,
          )
        : undefined,
      alert_link: input.id
        ? `https://admin.shoppingmall.com/alerts/${input.id}`
        : undefined,
    };
  }
}
