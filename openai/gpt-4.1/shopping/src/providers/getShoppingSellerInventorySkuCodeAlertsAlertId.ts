import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingInventoryAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAlert";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerInventorySkuCodeAlertsAlertId(props: {
  seller: SellerPayload;
  skuCode: string;
  alertId: string & tags.Format<"uuid">;
}): Promise<IShoppingInventoryAlert> {
  // 1. Fetch SKU by skuCode, enforcing ownership by seller
  const sku = await MyGlobal.prisma.shopping_skus.findFirst({
    where: {
      sku_code: props.skuCode,
      deleted_at: null,
      product: {
        shopping_seller_id: props.seller.id,
      },
    },
    select: { id: true },
  });
  if (!sku) {
    throw new HttpException("SKU not found or not owned by seller", 404);
  }

  // 2. Fetch alert by alertId for this SKU
  const alert = await MyGlobal.prisma.shopping_inventory_alerts.findFirst({
    where: {
      id: props.alertId,
      shopping_sku_id: sku.id,
    },
  });
  if (!alert) {
    throw new HttpException("Inventory alert not found", 404);
  }

  // 3. Map alert fields to IShoppingInventoryAlert, with strict null/undefined logic
  return {
    id: alert.id,
    shopping_sku_id: alert.shopping_sku_id,
    alert_type: alert.alert_type,
    resolved: alert.resolved,
    triggered_at: toISOStringSafe(alert.triggered_at),
    resolved_at: alert.resolved_at ? toISOStringSafe(alert.resolved_at) : null,
    resolved_actor_type: alert.resolved_actor_type ?? null,
    resolved_actor_id: alert.resolved_actor_id ?? null,
    context_note: alert.context_note ?? null,
  };
}
