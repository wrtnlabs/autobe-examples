import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrder.ICreate;
}): Promise<IShoppingMallOrder> {
  const { customer, body } = props;

  const skuIds = body.shopping_mall_order_items.map(
    (item) => item.shopping_mall_product_sku_id,
  );
  const skus = await MyGlobal.prisma.shopping_mall_product_skus.findMany({
    where: { id: { in: skuIds } },
  });

  if (skus.length !== skuIds.length) {
    throw new HttpException("One or more product SKUs are invalid", 400);
  }

  const totalAmount = body.shopping_mall_order_items.reduce(
    (sum, item) => sum + item.total_price,
    0,
  );

  const now = toISOStringSafe(new Date());

  const createdOrder = await MyGlobal.prisma.$transaction(async (tx) => {
    const order = await tx.shopping_mall_orders.create({
      data: {
        id: v4(),
        shopping_mall_customer_id: customer.id,
        order_code: body.order_code,
        shipping_address: body.shipping_address,
        status: "pending",
        payment_status: "unpaid",
        total_amount: totalAmount,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        shopping_mall_order_items: {
          create: body.shopping_mall_order_items.map((item) => ({
            id: v4(),
            shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price,
            created_at: item.created_at ?? now,
            updated_at: item.updated_at ?? now,
            deleted_at: null,
          })),
        },
        shopping_mall_payments: body.shopping_mall_payments
          ? {
              create: body.shopping_mall_payments.map((payment) => ({
                id: v4(),
                payment_method: payment.payment_method,
                payment_status: payment.payment_status,
                payment_amount: payment.payment_amount,
                payment_date: payment.payment_date,
                created_at: payment.created_at,
                updated_at: payment.updated_at,
                deleted_at: null,
              })),
            }
          : undefined,
      },
      include: {
        shopping_mall_order_items: true,
        shopping_mall_payments: true,
        customer: true,
      },
    });

    return order;
  });

  return {
    id: createdOrder.id,
    shopping_mall_customer_id: createdOrder.shopping_mall_customer_id,
    order_code: createdOrder.order_code,
    shipping_address: createdOrder.shipping_address,
    status: createdOrder.status,
    payment_status: createdOrder.payment_status,
    total_amount: createdOrder.total_amount,
    created_at: toISOStringSafe(createdOrder.created_at),
    updated_at: toISOStringSafe(createdOrder.updated_at),
    deleted_at: createdOrder.deleted_at
      ? toISOStringSafe(createdOrder.deleted_at)
      : undefined,
    customer: {
      id: createdOrder.customer.id,
      email: createdOrder.customer.email,
      nickname: createdOrder.customer.nickname,
      created_at: toISOStringSafe(createdOrder.customer.created_at),
    },
    shopping_mall_order_items: createdOrder.shopping_mall_order_items.map(
      (item) => ({
        id: item.id,
        shopping_mall_order_id: createdOrder.id,
        shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at
          ? toISOStringSafe(item.deleted_at)
          : undefined,
      }),
    ),
    shopping_mall_payments: createdOrder.shopping_mall_payments
      ? createdOrder.shopping_mall_payments.map((payment) => ({
          id: payment.id,
          shopping_mall_order_id: createdOrder.id,
          payment_method: payment.payment_method,
          payment_status: payment.payment_status,
          payment_amount: payment.payment_amount,
          payment_date: toISOStringSafe(payment.payment_date),
          created_at: toISOStringSafe(payment.created_at),
          updated_at: toISOStringSafe(payment.updated_at),
          deleted_at: payment.deleted_at
            ? toISOStringSafe(payment.deleted_at)
            : undefined,
          order: undefined,
        }))
      : [],
    shopping_mall_shipment_trackings: [],
    shopping_mall_product_reviews: [],
    shopping_mall_order_histories: [],
    shopping_mall_order_cancellations: [],
    shopping_mall_refund_requests: [],
    shopping_mall_return_shipments: [],
  };
}
