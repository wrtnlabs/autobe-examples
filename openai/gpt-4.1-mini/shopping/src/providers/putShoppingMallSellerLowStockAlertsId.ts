import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLowStockAlert } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLowStockAlert";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerLowStockAlertsId(props: {
  seller: SellerPayload;
  id: string & tags.Format<"uuid">;
  body: IShoppingMallLowStockAlert.IUpdate;
}): Promise<IShoppingMallLowStockAlert> {
  const { seller, id, body } = props;

  const alert = await MyGlobal.prisma.shopping_mall_low_stock_alerts.findUnique(
    {
      where: { id },
      include: {
        productSku: {
          include: {
            product: true,
          },
        },
      },
    },
  );

  if (!alert) {
    throw new HttpException("Low stock alert not found", 404);
  }

  // We will cast seller id safely from product because of unknown Prisma typing
  // Cast ownerSellerId as string | null safely
  const ownerSellerId: string | null =
    (alert.productSku.product as { shopping_mall_seller_id?: string | null })
      .shopping_mall_seller_id ?? null;

  if (ownerSellerId !== seller.id) {
    throw new HttpException(
      "Forbidden: You do not own this low stock alert",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_low_stock_alerts.update({
    where: { id },
    data: {
      resolved: body.resolved,
      resolved_at:
        body.resolved_at === null ? null : (body.resolved_at ?? undefined),
      alerted_at: body.alerted_at,
      shopping_mall_product_sku_id: body.shopping_mall_product_sku_id,
    },
  });

  return {
    id: updated.id,
    shopping_mall_product_sku_id: updated.shopping_mall_product_sku_id,
    alerted_at: toISOStringSafe(updated.alerted_at),
    resolved: updated.resolved,
    resolved_at:
      updated.resolved_at === null
        ? null
        : updated.resolved_at !== undefined
          ? toISOStringSafe(updated.resolved_at)
          : undefined,
  };
}
