import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminLowStockAlertsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallLowStockAlert.IUpdate;
}): Promise<IShoppingMallLowStockAlert> {
  const { admin, id, body } = props;

  const updated = await MyGlobal.prisma.shopping_mall_low_stock_alerts.update({
    where: { id },
    data: {
      resolved: body.resolved,
      resolved_at: body.resolved_at ?? null,
      alerted_at: body.alerted_at,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    alerted_at: toISOStringSafe(updated.alerted_at),
    resolved: updated.resolved,
    resolved_at: updated.resolved_at
      ? toISOStringSafe(updated.resolved_at)
      : null,
  };
}
