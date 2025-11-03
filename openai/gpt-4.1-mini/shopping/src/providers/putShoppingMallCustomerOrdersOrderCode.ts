import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { IShoppingMallShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipmentTracking";
import { IShoppingMallProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReview";
import { IShoppingMallOrderHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderHistory";
import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallReturnShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReturnShipment";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerOrdersOrderCode(props: {
  customer: CustomerPayload;
  orderCode: string;
  body: IShoppingMallOrder.IUpdate;
}): Promise<IShoppingMallOrder> {
  const { customer, orderCode, body } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { order_code: orderCode },
  });

  if (order.shopping_mall_customer_id !== customer.id) {
    throw new HttpException("Forbidden: You cannot update this order", 403);
  }

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.shopping_mall_orders.update({
    where: { order_code: orderCode },
    data: {
      shipping_address: body.shipping_address ?? undefined,
      status: body.status ?? undefined,
      payment_status: body.payment_status ?? undefined,
      total_amount: body.total_amount ?? undefined,
      order_code: body.order_code ?? undefined,
      updated_at: body.updated_at ?? now,
    },
  });

  const updatedOrder =
    await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
      where: { order_code: orderCode },
      include: {
        customer: true,
        shopping_mall_order_items: true,
        shopping_mall_payments: true,
        shopping_mall_shipment_trackings: true,
        shopping_mall_product_reviews: true,
        shopping_mall_order_histories: true,
        shopping_mall_order_cancellations: true,
        shopping_mall_refund_requests: true,
      },
    });

  return {
    id: updatedOrder.id,
    shopping_mall_customer_id: updatedOrder.shopping_mall_customer_id,
    order_code: updatedOrder.order_code,
    status: updatedOrder.status,
    payment_status: updatedOrder.payment_status,
    total_amount: updatedOrder.total_amount,
    shipping_address: updatedOrder.shipping_address,
    created_at: toISOStringSafe(updatedOrder.created_at),
    updated_at: toISOStringSafe(updatedOrder.updated_at),
    deleted_at: updatedOrder.deleted_at
      ? toISOStringSafe(updatedOrder.deleted_at)
      : undefined,
    customer: {
      id: updatedOrder.customer.id,
      email: updatedOrder.customer.email,
      nickname: updatedOrder.customer.nickname,
      created_at: toISOStringSafe(updatedOrder.customer.created_at),
    },
    shopping_mall_order_items: updatedOrder.shopping_mall_order_items.map(
      (item) => ({
        ...item,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at
          ? toISOStringSafe(item.deleted_at)
          : undefined,
      }),
    ),
    shopping_mall_payments: updatedOrder.shopping_mall_payments.map(
      (payment) => ({
        ...payment,
        payment_date: toISOStringSafe(payment.payment_date),
        created_at: toISOStringSafe(payment.created_at),
        updated_at: toISOStringSafe(payment.updated_at),
        deleted_at: payment.deleted_at
          ? toISOStringSafe(payment.deleted_at)
          : undefined,
      }),
    ),
    shopping_mall_shipment_trackings:
      updatedOrder.shopping_mall_shipment_trackings.map((tracking) => ({
        ...tracking,
        shipped_at: toISOStringSafe(tracking.shipped_at),
        delivered_at: tracking.delivered_at
          ? toISOStringSafe(tracking.delivered_at)
          : undefined,
        created_at: toISOStringSafe(tracking.created_at),
        updated_at: toISOStringSafe(tracking.updated_at),
        deleted_at: tracking.deleted_at
          ? toISOStringSafe(tracking.deleted_at)
          : undefined,
      })),
    shopping_mall_product_reviews:
      updatedOrder.shopping_mall_product_reviews.map((review) => ({
        ...review,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
        deleted_at: review.deleted_at
          ? toISOStringSafe(review.deleted_at)
          : undefined,
      })),
    shopping_mall_order_histories:
      updatedOrder.shopping_mall_order_histories.map((history) => ({
        ...history,
        created_at: toISOStringSafe(history.created_at),
        updated_at: toISOStringSafe(history.updated_at),
      })),
    shopping_mall_order_cancellations:
      updatedOrder.shopping_mall_order_cancellations.map((cancellation) => ({
        ...cancellation,
        created_at: toISOStringSafe(cancellation.created_at),
        updated_at: toISOStringSafe(cancellation.updated_at),
      })),
    shopping_mall_refund_requests:
      updatedOrder.shopping_mall_refund_requests.map((refund) => ({
        ...refund,
        created_at: toISOStringSafe(refund.created_at),
        updated_at: toISOStringSafe(refund.updated_at),
      })),
    shopping_mall_return_shipments: [],
  };
}
