import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteShoppingMallAdminOrdersOrderNumber(props: {
  admin: AdminPayload;
  orderNumber: string;
}): Promise<void> {
  // 1. Check order existence, must not be already deleted
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { order_number: props.orderNumber },
  });
  if (!order) {
    throw new HttpException("Order not found.", 404);
  }
  if (order.deleted_at !== null) {
    throw new HttpException("Order already deleted.", 410);
  }

  // 2. Block if dependent order_items exist that are not refunded or delivered
  const blockedOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirst({
      where: {
        shopping_mall_order_id: order.id,
        deleted_at: null,
        OR: [{ refunded: false }, { delivered: false }],
      },
    });
  if (blockedOrderItem) {
    throw new HttpException(
      "Order items are not fully delivered or refunded.",
      409,
    );
  }

  // 3. Block if any open order shipments exist
  const openShipment =
    await MyGlobal.prisma.shopping_mall_order_shipments.findFirst({
      where: {
        shopping_mall_order_id: order.id,
        deleted_at: null,
        status: { in: ["pending", "shipped", "in_transit"] },
      },
    });
  if (openShipment) {
    throw new HttpException("Order has active shipments.", 409);
  }

  // 4. Block if any unresolved payments exist
  const unresolvedPayment =
    await MyGlobal.prisma.shopping_mall_payments.findFirst({
      where: {
        AND: [
          { deleted_at: null },
          { customer_id: order.shopping_mall_customer_id },
          { status: { notIn: ["refunded", "completed", "failed"] } },
        ],
      },
    });
  if (unresolvedPayment) {
    throw new HttpException("Order has unresolved payments.", 409);
  }

  // 5. Block if there are open payment refunds
  const openRefund =
    await MyGlobal.prisma.shopping_mall_payment_refunds.findFirst({
      where: {
        payment: {
          customer_id: order.shopping_mall_customer_id,
        },
        status: { notIn: ["completed", "failed", "rejected"] },
        deleted_at: null,
      },
    });
  if (openRefund) {
    throw new HttpException("Order has open refunds in progress.", 409);
  }

  // 6. Update: Perform soft delete by updating deleted_at
  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { id: order.id },
    data: { deleted_at: toISOStringSafe(new Date()) },
  });
}
