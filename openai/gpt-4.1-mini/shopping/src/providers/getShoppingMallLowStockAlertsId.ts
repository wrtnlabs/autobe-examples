import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";

export async function getShoppingMallLowStockAlertsId(props: {
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallLowStockAlert> {
  const { id } = props;

  const alert =
    await MyGlobal.prisma.shopping_mall_low_stock_alerts.findUniqueOrThrow({
      where: { id },
    });

  return {
    id: alert.id,
    shopping_mall_product_sku_id: alert.shopping_mall_product_sku_id,
    alerted_at: toISOStringSafe(alert.alerted_at),
    resolved: alert.resolved,
    resolved_at: alert.resolved_at ? toISOStringSafe(alert.resolved_at) : null,
  };
}
