import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingAdminInventorySkuCodeAlertsAlertId(props: {
  admin: AdminPayload;
  skuCode: string;
  alertId: string & tags.Format<"uuid">;
}): Promise<IShoppingInventoryAlert> {
  // Step 1: Find SKU by code
  const sku = await MyGlobal.prisma.shopping_skus.findUnique({
    where: { sku_code: props.skuCode },
  });
  if (!sku) throw new HttpException("SKU not found", 404);

  // Step 2: Find alert by alertId and skuId
  const alert = await MyGlobal.prisma.shopping_inventory_alerts.findFirst({
    where: {
      id: props.alertId,
      shopping_sku_id: sku.id,
    },
  });
  if (!alert) throw new HttpException("Alert not found for specified SKU", 404);

  return {
    id: alert.id,
    shopping_sku_id: alert.shopping_sku_id,
    alert_type: alert.alert_type,
    resolved: alert.resolved,
    triggered_at: toISOStringSafe(alert.triggered_at),
    resolved_at:
      alert.resolved_at !== null && alert.resolved_at !== undefined
        ? toISOStringSafe(alert.resolved_at)
        : null,
    resolved_actor_type: alert.resolved_actor_type ?? null,
    resolved_actor_id: alert.resolved_actor_id ?? null,
    context_note: alert.context_note ?? null,
  };
}
