import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemVariantOption";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerOrdersOrderIdItemsOrderItemIdRefund(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequest.ICreate;
}): Promise<IShoppingMallRefundRequest> {
  // 1. Validate order exists and belongs to customer
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      shopping_mall_customer_id: true,
      order_number: true,
      total_price: true,
      status: true,
      created_at: true,
      customer: {
        select: {
          id: true,
          email: true,
          display_name: true,
          phone_number: true,
          deleted_at: true,
          created_at: true,
          updated_at: true,
        },
      } satisfies Prisma.shopping_mall_customersFindManyArgs,
    },
  });
  // Verify customer owns the order
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Validate order item exists and belongs to order
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        shopping_mall_order_id: true,
        status: true,
        quantity: true,
        unit_price: true,
        product_name: true,
        product_thumbnail_url: true,
        product_category_name: true,
        variant_sku_code: true,
        variant_price: true,
        seller_shop_name: true,
        created_at: true,
      },
    });
  if (orderItem.shopping_mall_order_id !== props.orderId) {
    throw new HttpException("Order item does not belong to this order", 400);
  }
  // 3. Validate item status is 'delivered' - refund only for delivered items
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Refund requests are only available for delivered items",
      400,
    );
  }
  // 4. Find shipment and validate 7-day window from delivery confirmation
  const shipmentItem =
    await MyGlobal.prisma.shopping_mall_order_shipment_items.findUnique({
      where: { shopping_mall_order_item_id: props.orderItemId },
      select: {
        shipment: {
          select: {
            delivered_at: true,
            delivery_confirmation_method: true,
          },
        } satisfies Prisma.shopping_mall_order_shipmentsFindManyArgs,
      },
    });
  if (!shipmentItem || !shipmentItem.shipment.delivered_at) {
    throw new HttpException("Delivery confirmation not found", 400);
  }
  const deliveredAt = shipmentItem.shipment.delivered_at;
  const now = new Date();
  const daysSinceDelivery =
    (now.getTime() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceDelivery > 7) {
    throw new HttpException(
      "Refund request must be within 7 days of delivery",
      400,
    );
  }
  // 5. Check for existing pending request (unique constraint on order_item_id)
  const existingRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUnique({
      where: { order_item_id: props.orderItemId },
    });
  if (existingRequest && existingRequest.status === "pending") {
    throw new HttpException(
      "A pending refund request already exists for this item",
      409,
    );
  }
  // 6. Create refund request in cancellation_requests table
  // Note: Same table serves both cancellation (paid items) and refund (delivered items) requests
  const refundRequestId = v4();
  const nowTimestamp = new Date();
  await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
    data: {
      id: refundRequestId,
      order_item_id: props.orderItemId,
      customer_id: props.customer.id,
      reason: props.body.reason,
      status: "pending",
      seller_response: null,
      rejection_reason: null,
      created_at: nowTimestamp,
      updated_at: nowTimestamp,
    },
  });
  // 7. Create initial snapshot for audit trail
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_cancellation_request_id: refundRequestId,
      previous_status: null,
      new_status: "pending",
      reason: props.body.reason,
      seller_response: null,
      rejection_reason: null,
      created_at: nowTimestamp,
    },
  });
  // 8. Fetch variant options for the order item
  const variantOptions =
    await MyGlobal.prisma.shopping_mall_order_item_variant_options.findMany({
      where: { shopping_mall_order_item_id: props.orderItemId },
      select: {
        id: true,
        key: true,
        value: true,
        created_at: true,
      },
    });
  // 9. Return the created refund request
  return {
    id: refundRequestId,
    orderItem: {
      id: orderItem.id,
      status: orderItem.status,
      quantity: orderItem.quantity,
      unit_price: orderItem.unit_price,
      subtotal: orderItem.quantity * orderItem.unit_price,
      product_name: orderItem.product_name,
      product_thumbnail_url: orderItem.product_thumbnail_url,
      product_category_name: orderItem.product_category_name,
      variant_sku_code: orderItem.variant_sku_code,
      variant_price: orderItem.variant_price,
      seller_shop_name: orderItem.seller_shop_name,
      created_at: orderItem.created_at.toISOString(),
      order: {
        id: order.id,
        orderNumber: order.order_number,
        totalPrice: order.total_price,
        status: order.status,
        customer: {
          id: order.customer.id,
          email: order.customer.email,
          displayName: order.customer.display_name,
          phoneNumber: order.customer.phone_number,
          isDeleted: order.customer.deleted_at !== null,
          createdAt: order.customer.created_at.toISOString(),
          updatedAt: order.customer.updated_at.toISOString(),
        } satisfies IShoppingMallCustomer.ISummary,
        createdAt: order.created_at.toISOString(),
      } satisfies IShoppingMallOrder.ISummary,
      variant_options: variantOptions.map((vo) => ({
        id: vo.id,
        key: vo.key,
        value: vo.value,
        created_at: vo.created_at.toISOString(),
      })) satisfies IShoppingMallOrderItemVariantOption[],
    } satisfies IShoppingMallOrderItem.ISummary,
    reason: props.body.reason,
    status: "pending",
    sellerResponse: null,
    rejectionReason: null,
    createdAt: nowTimestamp.toISOString(),
    updatedAt: nowTimestamp.toISOString(),
  } satisfies IShoppingMallRefundRequest;
}
