import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function putShoppingMallSellerOrdersOrderIdPaymentsPaymentId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IUpdate;
}): Promise<IShoppingMallPayment> {
  const { seller, orderId, paymentId, body } = props;

  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: paymentId },
    include: { order: true },
  });

  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  if (!payment.order || payment.order.deleted_at !== null) {
    throw new HttpException("Order not found", 404);
  }

  if (payment.order.id !== orderId) {
    throw new HttpException(
      "Payment does not belong to the specified order",
      400,
    );
  }

  if (payment.order.shopping_mall_seller_id !== seller.id) {
    throw new HttpException(
      "Unauthorized: This seller does not own the order",
      403,
    );
  }

  const updated = await MyGlobal.prisma.shopping_mall_payments.update({
    where: { id: paymentId },
    data: {
      payment_amount: body.payment_amount,
      payment_method: body.payment_method,
      payment_status: body.payment_status,
      transaction_id:
        body.transaction_id === null
          ? null
          : (body.transaction_id ?? undefined),
      confirmed_at:
        body.confirmed_at === null ? null : (body.confirmed_at ?? undefined),
    },
  });

  return {
    id: updated.id,
    shopping_mall_order_id: updated.shopping_mall_order_id,
    payment_amount: updated.payment_amount,
    payment_method: updated.payment_method,
    payment_status: updated.payment_status,
    transaction_id: updated.transaction_id ?? null,
    confirmed_at: updated.confirmed_at
      ? toISOStringSafe(updated.confirmed_at)
      : null,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}
