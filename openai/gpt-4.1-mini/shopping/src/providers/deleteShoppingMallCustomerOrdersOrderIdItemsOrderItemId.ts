import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function deleteShoppingMallCustomerOrdersOrderIdItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { customer, orderId, orderItemId } = props;

  // Check if the order item exists and belongs to the order owned by this customer
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findFirst({
    where: {
      id: orderItemId,
      shopping_mall_order_id: orderId,
      order: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    },
  });

  if (!orderItem) {
    throw new HttpException(
      "Order item not found or does not belong to you",
      404,
    );
  }

  // Delete the order item permanently
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: orderItemId },
  });
}
