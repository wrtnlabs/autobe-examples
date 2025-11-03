import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingMallSellerOrdersOrderCodeItemsItemId(props: {
  seller: SellerPayload;
  orderCode: string;
  itemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const { seller, orderCode, itemId } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: { id: true },
  });

  if (!order) throw new HttpException("Order not found", 404);

  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: itemId,
      shopping_mall_order_id: order.id,
      deleted_at: null,
    },
  });

  if (!orderItem) throw new HttpException("Order item not found", 404);

  const sku = await MyGlobal.prisma.shopping_mall_product_skus.findFirst({
    where: {
      id: orderItem.shopping_mall_product_sku_id,
      deleted_at: null,
    },
  });

  if (!sku)
    throw new HttpException("Unauthorized: seller does not own the SKU", 403);

  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_sku_id: orderItem.shopping_mall_product_sku_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
    created_at: toISOStringSafe(orderItem.created_at),
    updated_at: toISOStringSafe(orderItem.updated_at),
    deleted_at: orderItem.deleted_at
      ? toISOStringSafe(orderItem.deleted_at)
      : null,
  };
}
