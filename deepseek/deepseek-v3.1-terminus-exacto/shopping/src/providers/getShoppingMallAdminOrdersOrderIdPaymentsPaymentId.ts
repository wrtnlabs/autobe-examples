import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdPaymentsPaymentId(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  // Verify the order exists and admin has access
  const orderExists = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
    },
    select: {
      id: true,
    },
  });

  if (!orderExists) {
    throw new HttpException("Order not found", 404);
  }

  // Find the payment record with order relationship
  const payment = await MyGlobal.prisma.shopping_mall_payments.findFirst({
    where: {
      id: props.paymentId,
      shopping_mall_order_id: props.orderId,
    },
    include: {
      order: {
        include: {
          customer: true,
        },
      },
    },
  });

  if (!payment) {
    throw new HttpException("Payment not found for the specified order", 404);
  }

  // Convert the payment record to match IShoppingMallPayment interface with proper type handling
  const result: IShoppingMallPayment = {
    id: payment.id,
    payment_method: typia.assert<
      "credit_card" | "paypal" | "bank_transfer" | "digital_wallet"
    >(payment.payment_method),
    payment_gateway: payment.payment_gateway,
    transaction_id: payment.transaction_id,
    amount: payment.amount,
    currency: payment.currency,
    status: typia.assert<
      | "refunded"
      | "disputed"
      | "pending"
      | "authorized"
      | "captured"
      | "declined"
      | "chargeback"
    >(payment.status),
    authorization_code:
      payment.authorization_code === null
        ? undefined
        : payment.authorization_code,
    captured_at:
      payment.captured_at === null
        ? undefined
        : toISOStringSafe(payment.captured_at),
    refunded_amount:
      payment.refunded_amount === null ? undefined : payment.refunded_amount,
    payment_details:
      payment.payment_details === null ? undefined : payment.payment_details,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    order: payment.order
      ? {
          id: payment.order.id,
          order_number: payment.order.order_number,
          total_amount: payment.order.total_amount,
          subtotal_amount: payment.order.subtotal_amount,
          tax_amount: payment.order.tax_amount,
          shipping_amount: payment.order.shipping_amount,
          currency: payment.order.currency,
          status: payment.order.status,
          shipping_address: payment.order.shipping_address,
          billing_address: payment.order.billing_address,
          created_at: toISOStringSafe(payment.order.created_at),
          updated_at: toISOStringSafe(payment.order.updated_at),
          customer: {
            id: payment.order.customer.id,
            email: payment.order.customer.email,
            first_name: payment.order.customer.first_name,
            last_name: payment.order.customer.last_name,
            phone_number:
              payment.order.customer.phone_number === null
                ? undefined
                : payment.order.customer.phone_number,
            status: payment.order.customer.status,
            created_at: toISOStringSafe(payment.order.customer.created_at),
            updated_at:
              payment.order.customer.updated_at === null
                ? undefined
                : toISOStringSafe(payment.order.customer.updated_at),
          },
        }
      : undefined,
  };

  return result;
}
