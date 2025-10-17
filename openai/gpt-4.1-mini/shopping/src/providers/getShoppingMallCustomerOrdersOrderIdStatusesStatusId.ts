import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderStatus";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerOrdersOrderIdStatusesStatusId(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  statusId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallOrderStatus> {
  const { customer, orderId, statusId } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: orderId },
    select: { shopping_mall_customer_id: true },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: You do not own this order", 403);
  }

  const orderStatus =
    await MyGlobal.prisma.shopping_mall_order_statuses.findUnique({
      where: { id: statusId },
    });

  if (!orderStatus) {
    throw new HttpException("Order status not found", 404);
  }

  if (orderStatus.shopping_mall_order_id !== orderId) {
    throw new HttpException(
      "Order status does not belong to specified order",
      404,
    );
  }

  return {
    id: orderStatus.id,
    shopping_mall_order_id: orderStatus.shopping_mall_order_id,
    status: orderStatus.status,
    status_changed_at: toISOStringSafe(orderStatus.status_changed_at),
  };
}
