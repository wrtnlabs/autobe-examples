import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryAlert";

export async function getShoppingMallInventoryAlertsAlertId(props: {
  alertId: string;
}): Promise<IShoppingMallInventoryAlert> {
  const alert = await MyGlobal.prisma.shopping_mall_inventory_alerts.findUnique(
    {
      where: { id: props.alertId },
    },
  );

  if (!alert) {
    throw new HttpException("Inventory alert not found", 404);
  }

  return {
    id: alert.id,
    inventory_unit_id: alert.inventory_unit_id,
    seller_id: alert.seller_id,
    alert_type: alert.alert_type satisfies string as
      | "low_stock"
      | "critical_stock"
      | "back_in_stock",
    threshold: alert.threshold,
    current_stock: alert.current_stock,
    alerted_at: toISOStringSafe(alert.alerted_at),
    cleared_at: alert.cleared_at ? toISOStringSafe(alert.cleared_at) : null,
    status: alert.status satisfies string as "active" | "cleared",
  };
}
