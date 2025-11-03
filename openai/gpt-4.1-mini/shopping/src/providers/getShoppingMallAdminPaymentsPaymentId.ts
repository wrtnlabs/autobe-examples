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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminPaymentsPaymentId(props: {
  admin: AdminPayload;
  paymentId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPayment> {
  const { paymentId } = props;

  const payment = await MyGlobal.prisma.shopping_mall_payments.findUnique({
    where: { id: paymentId },
  });

  if (!payment) {
    throw new HttpException("Payment not found", 404);
  }

  // Fetch order separately without unsupported fields
  const order = await MyGlobal.prisma.shopping_mall_orders.findUnique({
    where: { id: payment.shopping_mall_order_id },
    select: {
      id: true,
      order_code: true,
      status: true,
      payment_status: true,
      total_amount: true,
      shipping_address: true,
      created_at: true,
      updated_at: true,
      shopping_mall_customer_id: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Fetch customer separately
  const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique({
    where: { id: order.shopping_mall_customer_id },
    select: {
      id: true,
      email: true,
      nickname: true,
      created_at: true,
    },
  });

  if (!customer) {
    throw new HttpException("Customer not found", 404);
  }

  const mappedOrder = {
    id: order.id,
    order_code: order.order_code,
    status: order.status,
    payment_status: order.payment_status,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    order_items_count: 0, // order_items_count not available; default to 0
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    customer: {
      id: customer.id,
      email: customer.email,
      nickname: customer.nickname,
      created_at: toISOStringSafe(customer.created_at),
    },
  };

  return {
    id: payment.id,
    shopping_mall_order_id: payment.shopping_mall_order_id,
    payment_method: payment.payment_method,
    payment_status: payment.payment_status,
    payment_amount: payment.payment_amount,
    payment_date: toISOStringSafe(payment.payment_date),
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
    deleted_at: payment.deleted_at ? toISOStringSafe(payment.deleted_at) : null,
    order: mappedOrder,
  };
}
