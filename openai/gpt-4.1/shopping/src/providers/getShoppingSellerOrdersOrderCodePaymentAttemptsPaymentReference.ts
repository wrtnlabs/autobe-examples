import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingPaymentAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPaymentAttempt";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function getShoppingSellerOrdersOrderCodePaymentAttemptsPaymentReference(props: {
  seller: SellerPayload;
  orderCode: string;
  paymentReference: string;
}): Promise<IShoppingPaymentAttempt> {
  const { seller, orderCode, paymentReference } = props;

  // 1. Find the order by order_code and not deleted
  const order = await MyGlobal.prisma.shopping_orders.findFirst({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // 2. Access control: check if at least one order line belongs to seller
  const sellerOrderLine = await MyGlobal.prisma.shopping_order_lines.findFirst({
    where: {
      shopping_order_id: order.id,
      shopping_seller_id: seller.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!sellerOrderLine) {
    throw new HttpException(
      "Forbidden: Seller has no access to this order",
      403,
    );
  }

  // 3. Find the payment attempt by order and paymentReference
  const paymentAttempt =
    await MyGlobal.prisma.shopping_payment_attempts.findFirst({
      where: {
        shopping_order_id: order.id,
        payment_reference: paymentReference,
      },
    });
  if (!paymentAttempt) {
    throw new HttpException("Payment attempt not found", 404);
  }

  return {
    id: paymentAttempt.id,
    shopping_order_id: paymentAttempt.shopping_order_id,
    payment_reference:
      paymentAttempt.payment_reference !== undefined
        ? paymentAttempt.payment_reference
        : null,
    attempt_status: paymentAttempt.attempt_status,
    amount: paymentAttempt.amount,
    attempted_at: toISOStringSafe(paymentAttempt.attempted_at),
    completed_at:
      paymentAttempt.completed_at != null
        ? toISOStringSafe(paymentAttempt.completed_at)
        : null,
  };
}
