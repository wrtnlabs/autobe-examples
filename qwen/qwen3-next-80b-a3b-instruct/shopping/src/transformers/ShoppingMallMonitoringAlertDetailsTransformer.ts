import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallMonitoringAlertDetails } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertDetails";
import { IShoppingMallMonitoringAlertMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMonitoringAlertMetadata";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallMonitoringAlertDetailsTransformer {
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
  ): Promise<IShoppingMallMonitoringAlertDetails> {
    // Determine level from alert_type (primary) or severity (secondary)
    let level: "critical" | "warning" | "info";
    if (
      input.alert_type === "critical" ||
      input.alert_type === "warning" ||
      input.alert_type === "info"
    ) {
      level = input.alert_type;
    } else if (
      input.severity === "critical" ||
      input.severity === "warning" ||
      input.severity === "info"
    ) {
      level = input.severity;
    } else {
      // Default to info if neither alert_type nor severity is valid
      level = "info";
    }
    // Use detected_at for createdAt as primary source
    const createdAt = input.detected_at.toISOString();
    // Transform resolved_at to undefined if null, otherwise to ISO string
    const resolvedAt = input.resolved_at
      ? input.resolved_at.toISOString()
      : undefined;
    // Construct metadata as string from all available fields
    const metadataContext: Record<string, any> = {};
    // Include entity type and id as context
    if (input.entity_type) metadataContext.entity_type = input.entity_type;
    if (input.entity_id !== null && input.entity_id !== undefined)
      metadataContext.entity_id = input.entity_id;
    // Include timestamps
    metadataContext.created_at = input.created_at.toISOString();
    metadataContext.updated_at = input.updated_at.toISOString();
    // Include admin reference if present
    if (input.admin) {
      metadataContext.admin = {
        id: input.admin.id,
      };
    }
    // Combine with existing metadata if present
    let finalMetadata: string;
    if (input.metadata) {
      // Parse existing metadata and extend with context
      try {
        const existingMetadata = JSON.parse(input.metadata as string);
        finalMetadata = JSON.stringify({
          ...existingMetadata,
          ...metadataContext,
        });
      } catch (e) {
        // If existing metadata is malformed, use context only
        finalMetadata = JSON.stringify(metadataContext);
      }
    } else {
      // No existing metadata, use only context
      finalMetadata = JSON.stringify(metadataContext);
    }
    return {
      alertId: input.id,
      level,
      message: input.message,
      createdAt,
      resolvedAt,
      monitorKey: input.entity_type,
      metadata: finalMetadata,
    };
  }
}
