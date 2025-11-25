import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";

export async function getShoppingMallOrdersOrderNumberItemsId(props: {
  orderNumber: string;
  id: string;
}): Promise<IShoppingMallOrderItem> {
  const item = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: {
      shopping_mall_order_id: (
        await MyGlobal.prisma.shopping_mall_orders.findUnique({
          where: { order_number: props.orderNumber },
        })
      )?.id,
      id: props.id,
    },
  });

  if (!item) {
    throw new HttpException("Order item not found", 404);
  }

  return {
    id: item.id,
    shopping_mall_order_id:
      item.shopping_mall_order_id !== null ? item.shopping_mall_order_id : "",
    shopping_mall_product_variant_id:
      item.shopping_mall_product_variant_id !== null
        ? item.shopping_mall_product_variant_id
        : "",
    quantity: item.quantity,
    unit_price: item.unit_price,
    item_total: item.item_total,
  };
}
