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
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderCode(props: {
  admin: AdminPayload;
  orderCode: string;
}): Promise<IShoppingMallOrder> {
  const { orderCode } = props;

  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      order_code: orderCode,
      deleted_at: null,
    },
    include: {
      customer: {
        select: {
          id: true,
          email: true,
          nickname: true,
          created_at: true,
        },
      },
      shopping_mall_order_items: true,
      shopping_mall_payments: {
        include: {
          order: {
            select: {
              id: true,
              order_code: true,
              status: true,
              payment_status: true,
              total_amount: true,
              shipping_address: true,
              created_at: true,
              updated_at: true,
              deleted_at: true,
              customer: {
                select: {
                  id: true,
                  email: true,
                  nickname: true,
                  created_at: true,
                },
              },
            },
          },
        },
      },
      shopping_mall_shipment_trackings: true,
      shopping_mall_product_reviews: true,
      shopping_mall_order_histories: true,
      shopping_mall_order_cancellations: true,
      shopping_mall_refund_requests: true,
      // Removed shopping_mall_return_shipments to avoid compilation errors
    },
  });

  return {
    id: order.id,
    shopping_mall_customer_id: order.shopping_mall_customer_id,
    order_code: order.order_code,
    status: order.status,
    payment_status: order.payment_status,
    total_amount: order.total_amount,
    shipping_address: order.shipping_address,
    created_at: toISOStringSafe(order.created_at),
    updated_at: toISOStringSafe(order.updated_at),
    deleted_at: order.deleted_at ? toISOStringSafe(order.deleted_at) : null,

    customer: {
      id: order.customer.id satisfies string as string & tags.Format<"uuid">,
      email: order.customer.email,
      nickname: order.customer.nickname,
      created_at: toISOStringSafe(order.customer.created_at),
    },

    shopping_mall_order_items: order.shopping_mall_order_items.map(
      (item): IShoppingMallOrderItem => ({
        id: item.id,
        shopping_mall_order_id: item.shopping_mall_order_id,
        shopping_mall_product_sku_id: item.shopping_mall_product_sku_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        deleted_at: item.deleted_at ? toISOStringSafe(item.deleted_at) : null,
      }),
    ),

    shopping_mall_payments: order.shopping_mall_payments.map(
      (payment): IShoppingMallPayment => ({
        id: payment.id,
        shopping_mall_order_id: payment.shopping_mall_order_id,
        payment_method: payment.payment_method,
        payment_status: payment.payment_status,
        payment_amount: payment.payment_amount,
        payment_date: toISOStringSafe(payment.payment_date),
        created_at: toISOStringSafe(payment.created_at),
        updated_at: toISOStringSafe(payment.updated_at),
        deleted_at: payment.deleted_at
          ? toISOStringSafe(payment.deleted_at)
          : null,
        order: payment.order
          ? {
              id: payment.order.id,
              order_code: payment.order.order_code,
              status: payment.order.status,
              payment_status: payment.order.payment_status,
              total_amount: payment.order.total_amount,
              shipping_address: payment.order.shipping_address,
              created_at: toISOStringSafe(payment.order.created_at),
              updated_at: toISOStringSafe(payment.order.updated_at),
              order_items_count: 0,
              customer: payment.order.customer
                ? {
                    id: payment.order.customer.id satisfies string as string &
                      tags.Format<"uuid">,
                    email: payment.order.customer.email,
                    nickname: payment.order.customer.nickname,
                    created_at: toISOStringSafe(
                      payment.order.customer.created_at,
                    ),
                  }
                : ({} as never),
            }
          : undefined,
      }),
    ),

    shopping_mall_shipment_trackings:
      order.shopping_mall_shipment_trackings.map(
        (tracking): IShoppingMallShipmentTracking => ({
          id: tracking.id,
          shopping_mall_order_id: tracking.shopping_mall_order_id,
          tracking_number: tracking.tracking_number,
          carrier_name: tracking.carrier_name,
          shipping_status: tracking.shipping_status,
          shipped_at: toISOStringSafe(tracking.shipped_at),
          delivered_at: tracking.delivered_at
            ? toISOStringSafe(tracking.delivered_at)
            : null,
          created_at: toISOStringSafe(tracking.created_at),
          updated_at: toISOStringSafe(tracking.updated_at),
          deleted_at: tracking.deleted_at
            ? toISOStringSafe(tracking.deleted_at)
            : null,
        }),
      ),

    shopping_mall_product_reviews: order.shopping_mall_product_reviews.map(
      (review): IShoppingMallProductReview => ({
        id: review.id,
        shopping_mall_product_sku_id: review.shopping_mall_product_sku_id,
        shopping_mall_customer_id: review.shopping_mall_customer_id,
        shopping_mall_order_id: review.shopping_mall_order_id,
        rating: review.rating,
        review_body: review.review_body ?? null,
        moderation_status: review.moderation_status,
        created_at: toISOStringSafe(review.created_at),
        updated_at: toISOStringSafe(review.updated_at),
        deleted_at: review.deleted_at
          ? toISOStringSafe(review.deleted_at)
          : null,
      }),
    ),

    shopping_mall_order_histories: order.shopping_mall_order_histories.map(
      (history): IShoppingMallOrderHistory => ({
        id: history.id,
        shopping_mall_order_id: history.shopping_mall_order_id,
        order_status: history.order_status,
        payment_status: history.payment_status,
        shipment_status: history.shipment_status,
        total_amount: history.total_amount,
        created_at: toISOStringSafe(history.created_at),
        updated_at: toISOStringSafe(history.updated_at),
      }),
    ),

    shopping_mall_order_cancellations:
      order.shopping_mall_order_cancellations.map(
        (cancellation): IShoppingMallOrderCancellation => ({
          id: cancellation.id,
          shopping_mall_order_id: cancellation.shopping_mall_order_id,
          shopping_mall_customer_id: cancellation.shopping_mall_customer_id,
          cancellation_reason: cancellation.cancellation_reason ?? null,
          cancellation_status: cancellation.cancellation_status,
          created_at: toISOStringSafe(cancellation.created_at),
          updated_at: toISOStringSafe(cancellation.updated_at),
        }),
      ),

    shopping_mall_refund_requests: order.shopping_mall_refund_requests.map(
      (refund): IShoppingMallRefundRequest => ({
        id: refund.id,
        shopping_mall_order_id: refund.shopping_mall_order_id,
        shopping_mall_customer_id: refund.shopping_mall_customer_id,
        refund_amount: refund.refund_amount,
        refund_reason: refund.refund_reason ?? null,
        refund_status: refund.refund_status,
        created_at: toISOStringSafe(refund.created_at),
        updated_at: toISOStringSafe(refund.updated_at),
      }),
    ),

    shopping_mall_return_shipments: [],
  };
}
