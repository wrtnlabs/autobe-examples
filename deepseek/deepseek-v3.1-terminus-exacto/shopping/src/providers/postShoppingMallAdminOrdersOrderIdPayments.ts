import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postShoppingMallAdminOrdersOrderIdPayments(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  // Verify the order exists and get customer information
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      deleted_at: null,
    },
    include: {
      customer: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Create the payment record
  const payment = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.orderId,
      payment_method: props.body.payment_method,
      payment_gateway: props.body.payment_gateway,
      transaction_id: props.body.transaction_id,
      amount: props.body.amount,
      currency: props.body.currency,
      status: props.body.status,
      authorization_code: props.body.authorization_code ?? null,
      payment_details: props.body.payment_details ?? null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });

  // Construct the order summary for the response
  const orderSummary: IShoppingMallOrder.ISummary = {
    id: order.id,
    order_number: order.order_number,
    total_amount: order.total_amount,
    subtotal_amount: order.subtotal_amount,
    tax_amount: order.tax_amount,
    shipping_amount: order.shipping_amount,
    currency: order.currency,
    status: order.status,
    shipping_address: order.shipping_address,
    billing_address: order.billing_address,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer: {
      id: order.customer.id,
      email: order.customer.email,
      first_name: order.customer.first_name,
      last_name: order.customer.last_name,
      phone_number: order.customer.phone_number ?? undefined,
      status: order.customer.status,
      created_at: toISOStringSafe(order.customer.created_at),
      updated_at: order.customer.updated_at
        ? toISOStringSafe(order.customer.updated_at)
        : undefined,
    },
  };

  // Return the payment with order relationship
  return {
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
    authorization_code: payment.authorization_code ?? undefined,
    captured_at: payment.captured_at
      ? toISOStringSafe(payment.captured_at)
      : undefined,
    refunded_amount: payment.refunded_amount ?? undefined,
    payment_details: payment.payment_details ?? undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    order: orderSummary,
  };
}
