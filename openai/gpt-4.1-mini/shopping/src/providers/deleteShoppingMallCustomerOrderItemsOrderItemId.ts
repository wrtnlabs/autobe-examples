import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallCustomerOrderItemsOrderItemId(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
}): Promise<void> {
  const orderItem = await MyGlobal.prisma.shopping_mall_order_items.findUnique({
    where: { id: props.orderItemId },
    select: { id: true, shopping_mall_order_id: true },
  });
  if (!orderItem) {
    throw new HttpException("Order item not found", 404);
  }
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderItem.shopping_mall_order_id },
    select: { shopping_mall_customer_id: true },
  });
  if (!order || order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_order_items.delete({
    where: { id: props.orderItemId },
  });
  return;
}
