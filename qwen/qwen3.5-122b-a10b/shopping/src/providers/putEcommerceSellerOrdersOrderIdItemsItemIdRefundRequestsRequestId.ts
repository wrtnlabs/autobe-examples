import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceRefundRequestTransformer } from "../transformers/EcommerceRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceSellerOrdersOrderIdItemsItemIdRefundRequestsRequestId(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IUpdate;
}): Promise<IEcommerceRefundRequest> {
  // Verify refund request exists, is not soft-deleted, and belongs to the order item
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUnique({
      where: { id: props.requestId },
      select: {
        id: true,
        ecommerce_order_item_id: true,
        status: true,
        responded_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        reason: true,
      },
    });
  if (refundRequest === null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.deleted_at !== null) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.ecommerce_order_item_id !== props.itemId) {
    throw new HttpException(
      "Refund request does not belong to the specified order item",
      404,
    );
  }
  // Verify refund request status is pending
  if (refundRequest.status !== "pending") {
    throw new HttpException("Refund request is not in pending status", 409);
  }
  // Verify order item belongs to the specified order and get necessary data
  const orderItem = await MyGlobal.prisma.ecommerce_order_items.findUnique({
    where: { id: props.itemId },
    select: {
      id: true,
      ecommerce_order_id: true,
      ecommerce_product_variant_id: true,
      ecommerce_seller_id: true,
      status: true,
      quantity: true,
    },
  });
  if (orderItem === null) {
    throw new HttpException("Order item not found", 404);
  }
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  // Verify order item status is delivered (required for refund eligibility)
  if (orderItem.status !== "delivered") {
    throw new HttpException(
      "Order item must be in delivered status to request refund",
      400,
    );
  }
  // Verify seller owns the product variant
  if (orderItem.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate request body
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException(
      "Rejection reason is required when rejecting a refund request",
      400,
    );
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Status must be 'approved' or 'rejected'", 400);
  }
  // Update refund request and handle business logic
  const now = new Date();
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update refund request
    const refund = await tx.ecommerce_refund_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        responded_at: now,
        rejection_reason: props.body.rejection_reason ?? null,
        updated_at: now,
      },
    });
    // Create refund request snapshot with the new state
    await tx.ecommerce_refund_request_snapshots.create({
      data: {
        id: v4(),
        ecommerce_refund_request_id: props.requestId,
        reason: refundRequest.reason,
        status: props.body.status!,
        response_at: now,
        created_at: now,
      },
    });
    // If approved, update order item status and restore stock
    if (props.body.status === "approved") {
      // Update order item status to refunded
      await tx.ecommerce_order_items.update({
        where: { id: props.itemId },
        data: {
          status: "refunded",
          updated_at: now,
        },
      });
      // Create inventory record to restore stock
      await tx.ecommerce_inventory_records.create({
        data: {
          id: v4(),
          ecommerce_product_variant_id: orderItem.ecommerce_product_variant_id,
          reason: "refund_approved",
          created_at: now,
          quantity_change: orderItem.quantity,
          updated_at: now,
        },
      });
      // Recalculate parent order status based on all order items
      const orderItems = await tx.ecommerce_order_items.findMany({
        where: { ecommerce_order_id: props.orderId, deleted_at: null },
        select: { status: true },
      });
      const allRefunded = orderItems.every(
        (item) => item.status === "refunded",
      );
      const allCancelled = orderItems.every(
        (item) => item.status === "cancelled",
      );
      const hasShipped = orderItems.some((item) => item.status === "shipped");
      const hasDelivered = orderItems.some(
        (item) => item.status === "delivered",
      );
      const hasPaid = orderItems.some((item) => item.status === "paid");
      let newOrderStatus: string;
      if (allRefunded) {
        newOrderStatus = "refunded";
      } else if (allCancelled) {
        newOrderStatus = "cancelled";
      } else if (hasShipped) {
        newOrderStatus = "shipped";
      } else if (hasDelivered) {
        newOrderStatus = "delivered";
      } else if (hasPaid) {
        newOrderStatus = "paid";
      } else {
        newOrderStatus = "partially_completed";
      }
      await tx.ecommerce_orders.update({
        where: { id: props.orderId },
        data: {
          status: newOrderStatus,
          updated_at: now,
        },
      });
    }
    return refund;
  });
  // Fetch updated refund request with full relation data
  const refundWithRelations =
    await MyGlobal.prisma.ecommerce_refund_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceRefundRequestTransformer.select(),
    });
  return await EcommerceRefundRequestTransformer.transform(refundWithRelations);
}
