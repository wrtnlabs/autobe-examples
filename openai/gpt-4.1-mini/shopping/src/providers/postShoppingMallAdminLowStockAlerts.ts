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

export async function postShoppingMallAdminLowStockAlerts(props: {
  admin: AdminPayload;
  body: IShoppingMallLowStockAlert.ICreate;
}): Promise<IShoppingMallLowStockAlert> {
  const { admin, body } = props;

  const created = await MyGlobal.prisma.shopping_mall_low_stock_alerts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
      alerted_at: toISOStringSafe(body.alerted_at),
      resolved: body.resolved,
      resolved_at:
        body.resolved_at === undefined
          ? undefined
          : body.resolved_at === null
            ? null
            : toISOStringSafe(body.resolved_at),
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    shopping_mall_product_sku_id:
      created.shopping_mall_product_sku_id as string & tags.Format<"uuid">,
    alerted_at: toISOStringSafe(created.alerted_at),
    resolved: created.resolved,
    resolved_at:
      created.resolved_at === null
        ? null
        : created.resolved_at === undefined
          ? undefined
          : toISOStringSafe(created.resolved_at),
  };
}
