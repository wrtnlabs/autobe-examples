import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderItem> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: props.orderItemId,
      shopping_mall_order_id: props.orderId,
    },
  });

  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }

  return {
    id: orderItem.id,
    shopping_mall_order_id: orderItem.shopping_mall_order_id,
    shopping_mall_product_variant_id:
      orderItem.shopping_mall_product_variant_id,
    quantity: orderItem.quantity,
    unit_price: orderItem.unit_price,
    total_price: orderItem.total_price,
  };
}
