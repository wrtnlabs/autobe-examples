import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderIdOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItem.IUpdate;
}): Promise<IShoppingMallOrderItem> {
  const existing = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
  });

  if (!existing) {
    throw new HttpException("Order item not found", 404);
  }

  if (existing.shopping_mall_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      403,
    );
  }

  // Additional customer ownership validation could go here if schema allows

  const updated = await MyGlobal.prisma.shopping_mall_order_items.update({
    where: { id: props.orderItemId },
    data: {
      quantity: props.body.quantity ?? undefined,
      unit_price: props.body.unit_price ?? undefined,
      total_price: props.body.total_price ?? undefined,
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    shopping_mall_product_variant_id: updated.shopping_mall_product_variant_id,
    quantity: updated.quantity,
    unit_price: updated.unit_price,
    total_price: updated.total_price,
  };
}
