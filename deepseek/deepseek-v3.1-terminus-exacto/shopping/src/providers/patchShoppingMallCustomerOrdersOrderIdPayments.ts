import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerOrdersOrderIdPayments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallPayment.IRequest;
}): Promise<IPageIShoppingMallPayment.ISummary> {
  // Verify the order exists and belongs to the authenticated customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findFirst({
    where: {
      id: props.orderId,
      shopping_mall_customer_id: props.customer.id,
      deleted_at: null,
    },
    include: {
      customer: true,
    },
  });

  if (!order) {
    throw new HttpException("Order not found", 404);
  }

  // Build search conditions
  const whereCondition: Record<string, unknown> = {
    shopping_mall_order_id: props.orderId,
  };

  // Apply search filter
  if (props.body.search) {
    whereCondition.OR = [
      { transaction_id: { contains: props.body.search } },
      { payment_method: { contains: props.body.search } },
      { payment_gateway: { contains: props.body.search } },
      { authorization_code: { contains: props.body.search } },
    ];
  }

  // Apply status filter
  if (props.body.status) {
    whereCondition.status = props.body.status;
  }

  // Apply payment method filter
  if (props.body.payment_method) {
    whereCondition.payment_method = props.body.payment_method;
  }

  // Apply date range filter
  if (props.body.date_from || props.body.date_to) {
    whereCondition.created_at = {};
    if (props.body.date_from) {
      (whereCondition.created_at as Record<string, unknown>).gte =
        props.body.date_from;
    }
    if (props.body.date_to) {
      (whereCondition.created_at as Record<string, unknown>).lte =
        props.body.date_to;
    }
  }

  // Build order by condition
  const orderBy: Record<string, unknown> = {};
  const orderField = props.body.order_by || "created_at";
  const orderDirection = props.body.order_direction || "desc";
  orderBy[orderField] = orderDirection;

  // Calculate pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Execute concurrent queries for data and count
  const [payments, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payments.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_payments.count({
      where: whereCondition,
    }),
  ]);

  // Transform payments to match API interface
  const data = payments.map((payment) => ({
    id: payment.id,
    order: {
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
    },
    payment_method: payment.payment_method,
    payment_gateway: payment.payment_gateway,
    transaction_id: payment.transaction_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    authorization_code: payment.authorization_code ?? undefined,
    captured_at: payment.captured_at
      ? toISOStringSafe(payment.captured_at)
      : undefined,
    refunded_amount: payment.refunded_amount ?? undefined,
    payment_details: payment.payment_details ?? undefined,
    created_at: toISOStringSafe(payment.created_at),
    updated_at: toISOStringSafe(payment.updated_at),
  }));

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
